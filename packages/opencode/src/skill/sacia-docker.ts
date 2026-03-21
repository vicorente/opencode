import { $ } from "bun"
import path from "path"
import fs from "fs/promises"
import { Log } from "../util/log"
import { Flag } from "../flag/flag"
import { Filesystem } from "../util/filesystem"

const log = Log.create({ service: "sacia-docker" })

export namespace SaciaDocker {
  export const CONTAINER_NAME = "sacia-kali"
  export const IMAGE_NAME = "sacia-kali:latest"

  // Get the global SACIA script path
  function getGlobalScriptPath(): string {
    const home = process.env.HOME || "/root"
    return path.join(home, ".sacia", "docker", "sacia-kali.sh")
  }

  // Get the project-local SACIA script path
  function getProjectScriptPath(): string {
    return path.join(process.cwd(), ".sacia", "docker", "sacia-kali.sh")
  }

  // Get the SACIA config directory script path (from Global.Path.sacia)
  async function getConfigScriptPath(): Promise<string | null> {
    try {
      const { Global } = await import("../global")
      return path.join(Global.Path.sacia, "docker", "sacia-kali.sh")
    } catch {
      return null
    }
  }

  /**
   * Find the SACIA script in multiple locations
   * Priority: env var > global ~/.sacia > project .sacia
   */
  async function findScriptPath(): Promise<string | null> {
    // Check environment variable first
    const envPath = process.env.SACIA_SCRIPT_PATH
    if (envPath) {
      try {
        await fs.access(envPath)
        return envPath
      } catch {
        log.warn("SACIA_SCRIPT_PATH set but file not found", { path: envPath })
      }
    }

    // Check global ~/.sacia/docker/
    const globalPath = getGlobalScriptPath()
    if (await Filesystem.exists(globalPath)) {
      return globalPath
    }

    // Check project .sacia/docker/
    const projectPath = getProjectScriptPath()
    if (await Filesystem.exists(projectPath)) {
      return projectPath
    }

    // Check config directory
    const configPath = await getConfigScriptPath()
    if (configPath && await Filesystem.exists(configPath)) {
      return configPath
    }

    return null
  }

  /**
   * Install the SACIA script to global location if available in project
   */
  async function installScriptToGlobal(): Promise<boolean> {
    const projectPath = getProjectScriptPath()
    const globalPath = getGlobalScriptPath()
    const globalDir = path.dirname(globalPath)

    if (!await Filesystem.exists(projectPath)) {
      return false
    }

    try {
      // Create directory if needed
      await fs.mkdir(globalDir, { recursive: true })

      // Copy script
      await fs.copyFile(projectPath, globalPath)

      // Make executable
      await fs.chmod(globalPath, 0o755)

      log.info("installed SACIA script to global location", { globalPath })
      return true
    } catch (error) {
      log.warn("failed to install script globally", { error })
      return false
    }
  }

  export function isEnabled(): boolean {
    return process.env.SACIA_DISABLE_DOCKER !== "true" && Flag.SACIA_EXECUTOR === "docker-kali"
  }

  /**
   * Check if SACIA Docker integration is required
   * This is true when SACIA_EXECUTOR is set to "docker-kali" or when not explicitly disabled
   */
  export function isRequired(): boolean {
    return process.env.SACIA_DISABLE_DOCKER !== "true"
  }

  export async function isDockerAvailable(): Promise<boolean> {
    try {
      const result = await $`docker info`.quiet()
      return result.exitCode === 0
    } catch {
      return false
    }
  }

  export async function isContainerRunning(): Promise<boolean> {
    try {
      const result =
        await $`docker ps -q --filter name=${CONTAINER_NAME} --filter status=running`.quiet()
      return result.stdout.toString().trim().length > 0
    } catch {
      return false
    }
  }

  export async function containerExists(): Promise<boolean> {
    try {
      const result = await $`docker ps -aq --filter name=${CONTAINER_NAME}`.quiet()
      return result.stdout.toString().trim().length > 0
    } catch {
      return false
    }
  }

  export async function imageExists(): Promise<boolean> {
    try {
      const result = await $`docker images -q ${IMAGE_NAME}`.quiet()
      return result.stdout.toString().trim().length > 0
    } catch {
      return false
    }
  }

  /**
   * Start container using the SACIA management script
   * This handles both starting existing containers and creating new ones
   */
  export async function startContainer(): Promise<boolean> {
    let scriptPath = await findScriptPath()

    // If not found globally but exists in project, install it
    if (!scriptPath) {
      const installed = await installScriptToGlobal()
      if (installed) {
        scriptPath = getGlobalScriptPath()
      }
    }

    if (!scriptPath) {
      log.warn("SACIA script not found in any location")
      return false
    }

    try {
      log.info("starting container via SACIA script", { scriptPath })

      // Execute the script with 'start' command
      const result = await $`bash ${scriptPath} start`.quiet()

      if (result.exitCode !== 0) {
        log.error("script failed", {
          exitCode: result.exitCode,
          stderr: result.stderr.toString()
        })
        return false
      }

      log.info("container started successfully")
      return true
    } catch (error) {
      log.error("failed to start container via script", { error, scriptPath })
      return false
    }
  }

  export async function ensure(): Promise<{
    available: boolean
    running: boolean
    message?: string
  }> {
    if (!isEnabled()) {
      return { available: false, running: false, message: "SACIA Docker disabled" }
    }

    return ensureContainer()
  }

  /**
   * Always ensure the container is running, regardless of flags.
   * This is called at startup to guarantee the container is available.
   */
  export async function ensureContainer(): Promise<{
    available: boolean
    running: boolean
    message?: string
  }> {
    const dockerAvailable = await isDockerAvailable()
    if (!dockerAvailable) {
      return {
        available: false,
        running: false,
        message: "Docker no está disponible. Inicia Docker Desktop o el daemon.",
      }
    }

    const running = await isContainerRunning()
    if (running) {
      log.info("container already running")
      return { available: true, running: true }
    }

    log.info("container not running, attempting to start via script...")
    const started = await startContainer()

    if (started) {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const nowRunning = await isContainerRunning()
      if (nowRunning) {
        return { available: true, running: true }
      }
    }

    // Check what's missing to provide helpful error message
    const scriptPath = await findScriptPath()
    const hasImage = await imageExists()

    let message: string
    if (!scriptPath) {
      message = `Script SACIA no encontrado. Ubicaciones buscadas:
  - $SACIA_SCRIPT_PATH (variable de entorno)
  - ~/.sacia/docker/sacia-kali.sh (global)
  - .sacia/docker/sacia-kali.sh (proyecto actual)

Copia el script a ~/.sacia/docker/ o ejecuta desde el directorio del proyecto.`
    } else if (!hasImage) {
      message = `Imagen SACIA no encontrada. Ejecuta:
  ${scriptPath} build`
    } else {
      message = `No se pudo iniciar el contenedor. Intenta manualmente:
  ${scriptPath} start

O revisa los logs:
  ${scriptPath} logs`
    }

    return { available: false, running: false, message }
  }

  /**
   * Check and start container at startup. Exits the process if container cannot be started.
   * This ensures opencode cannot run without the SACIA Kali container.
   */
  export async function requireAtStartup(): Promise<void> {
    // Skip if explicitly disabled
    if (process.env.SACIA_DISABLE_DOCKER === "true") {
      log.info("SACIA Docker disabled by environment variable")
      return
    }

    console.log("Verificando contenedor sacia-kali...")

    const result = await ensureContainer()

    if (!result.available || !result.running) {
      console.error("\n╔══════════════════════════════════════════════════════════════╗")
      console.error("║  ERROR: No se pudo iniciar el contenedor sacia-kali          ║")
      console.error("╚══════════════════════════════════════════════════════════════╝")
      console.error("")
      console.error(result.message || "Error desconocido")
      console.error("")
      console.error("OpenCode requiere el contenedor sacia-kali para funcionar.")
      console.error("")
      process.exit(1)
    }

    console.log("Contenedor sacia-kali listo ✓")
  }
}
