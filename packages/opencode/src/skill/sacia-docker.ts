import { $ } from "bun"
import path from "path"
import fs from "fs"
import { Log } from "../util/log"
import { Flag } from "../flag/flag"
import { Global } from "../global"

const log = Log.create({ service: "sacia-docker" })

export namespace SaciaDocker {
  export const CONTAINER_NAME = "sacia-kali"
  export const IMAGE_NAME = "sacia-kali:latest"
  export const WORKSPACE_ROOT = "/workspace"
  export const SACIA_AGENTS_PATH = path.join(Global.Path.sacia, "AGENTS.md")

  /**
   * Check if SACIA AGENTS.md exists and warn if not
   */
  export function checkInstructions(): boolean {
    const saciaAgentsPath = SACIA_AGENTS_PATH

    if (!fs.existsSync(saciaAgentsPath)) {
      console.log("")
      console.log("╔══════════════════════════════════════════════════════════════╗")
      console.log("║  ADVERTENCIA: No se encontró el archivo de instrucciones     ║")
      console.log("╚══════════════════════════════════════════════════════════════╝")
      console.log("")
      console.log(`  No existe: ${saciaAgentsPath}`)
      console.log("")
      console.log("  Este archivo contiene las instrucciones base para SACIA.")
      console.log("  Crea el archivo con tus instrucciones personalizadas.")
      console.log("")
      console.log("  Ejemplo mínimo:")
      console.log("")
      console.log("    ---")
      console.log("    name: SACIA Agent")
      console.log("    description: Agente de ciberseguridad ofensiva")
      console.log("    ---")
      console.log("")
      console.log("    Eres un experto en ciberseguridad ofensiva...")
      console.log("")
      return false
    }

    log.info("SACIA instructions found", { path: saciaAgentsPath })
    return true
  }

  /**
   * Get the current workspace directory to mount
   * Uses process.cwd() during bootstrap
   */
  function getWorkspaceCwd(): string {
    // Always use cwd during bootstrap
    // Instance.directory is not available at this point
    try {
      return fs.realpathSync(process.cwd())
    } catch {
      return path.resolve(process.cwd())
    }
  }

  export function isEnabled(): boolean {
    return process.env.SACIA_DISABLE_DOCKER !== "true"
  }

  /**
   * Ensure container is running (for use by other modules)
   * Returns the container status
   */
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
        await $`docker inspect -f {{.State.Running}} ${CONTAINER_NAME}`.quiet()
      return result.stdout.toString().trim() === "true"
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
   * Check if container has the correct mount for the current workspace
   */
  async function hasCorrectMount(): Promise<boolean> {
    try {
      const cwd = getWorkspaceCwd()
      const result = await $`docker inspect -f {{range .Mounts}}{{.Source}}:{{.Destination}};{{end}} ${CONTAINER_NAME}`.quiet()
      const mounts = result.stdout.toString().trim().split(";").filter(Boolean)

      for (const mount of mounts) {
        const idx = mount.lastIndexOf(":")
        if (idx <= 0) continue
        const src = mount.slice(0, idx)
        const dst = mount.slice(idx + 1)
        if (dst === WORKSPACE_ROOT) {
          // Normalize source path for comparison
          let normalizedSrc = src
          try {
            normalizedSrc = fs.realpathSync(src)
          } catch {
            normalizedSrc = path.resolve(src)
          }
          if (normalizedSrc === cwd) {
            return true
          }
        }
      }
      return false
    } catch {
      return false
    }
  }

  /**
   * Check if container has the required capabilities
   */
  async function hasCapabilities(): Promise<boolean> {
    try {
      const result = await $`docker inspect -f {{json .HostConfig.CapAdd}} ${CONTAINER_NAME}`.quiet()
      const caps = result.stdout.toString().trim()
      return caps.includes("NET_ADMIN") && caps.includes("NET_RAW")
    } catch {
      return false
    }
  }

  /**
   * Find Dockerfile in the project
   */
  function findDockerfile(): string | null {
    const cwd = getWorkspaceCwd()
    const searchPaths = [
      path.join(cwd, ".sacia", "docker", "Dockerfile"),
      path.join(cwd, "Dockerfile"),
    ]

    // Also check parent directories
    let current = cwd
    for (let i = 0; i < 5; i++) {
      searchPaths.push(path.join(current, ".sacia", "docker", "Dockerfile"))
      searchPaths.push(path.join(current, "packages", "containers", "kali", "Dockerfile"))
      current = path.dirname(current)
    }

    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        return searchPath
      }
    }

    return null
  }

  /**
   * Build the Docker image if it doesn't exist
   */
  async function buildImage(): Promise<{ success: boolean; error?: string }> {
    const dockerfile = findDockerfile()
    if (!dockerfile) {
      return { success: false, error: "Dockerfile no encontrado" }
    }

    const buildDir = path.dirname(dockerfile)
    log.info("building image from Dockerfile", { dockerfile, buildDir })

    try {
      const result = await $`docker build -t ${IMAGE_NAME} -f ${dockerfile} ${buildDir}`
      if (result.exitCode !== 0) {
        return { success: false, error: result.stderr.toString() || "Build failed" }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Remove the container
   */
  async function removeContainer(): Promise<boolean> {
    try {
      await $`docker rm -f ${CONTAINER_NAME}`.quiet()
      return true
    } catch {
      return false
    }
  }

  /**
   * Create and start a new container with the current workspace mounted
   */
  async function createContainer(): Promise<{ success: boolean; error?: string }> {
    const cwd = getWorkspaceCwd()

    log.info("creating container", { cwd, workspace: WORKSPACE_ROOT })

    try {
      const result = await $`docker run -d \
        --name ${CONTAINER_NAME} \
        --cap-add=NET_ADMIN \
        --cap-add=NET_RAW \
        -v ${cwd}:${WORKSPACE_ROOT}:rw \
        -w ${WORKSPACE_ROOT} \
        ${IMAGE_NAME}`

      if (result.exitCode !== 0) {
        return { success: false, error: result.stderr.toString() || "Failed to create container" }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Start an existing container
   */
  async function startContainer(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await $`docker start ${CONTAINER_NAME}`.quiet()
      if (result.exitCode !== 0) {
        return { success: false, error: result.stderr.toString() || "Failed to start container" }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Ensure the container is running with the correct configuration
   * This implements the same logic as SACIA-TEST
   */
  export async function ensureContainer(): Promise<{
    available: boolean
    running: boolean
    message?: string
  }> {
    // Check Docker availability
    if (!(await isDockerAvailable())) {
      return {
        available: false,
        running: false,
        message: "Docker no está disponible. Inicia Docker Desktop o el daemon.",
      }
    }

    // Check/build image
    if (!(await imageExists())) {
      console.log("Preparando imagen Kali Docker (solo primera vez)...")
      const buildResult = await buildImage()
      if (!buildResult.success) {
        const dockerfile = findDockerfile()
        if (!dockerfile) {
          return {
            available: false,
            running: false,
            message: `Dockerfile no encontrado. Crea uno en:
  - .sacia/docker/Dockerfile
  - packages/containers/kali/Dockerfile

O proporciona una imagen 'sacia-kali:latest' existente.`,
          }
        }
        return {
          available: false,
          running: false,
          message: `Error construyendo imagen: ${buildResult.error}`,
        }
      }
    }

    // Check if container is running
    const running = await isContainerRunning()

    if (running) {
      // Check if mount is correct
      if (await hasCorrectMount()) {
        log.info("container running with correct mount")
        return { available: true, running: true }
      }

      // Need to recreate container with correct mount
      console.log("Reconfigurando contenedor Kali para este workspace...")
      await removeContainer()
      const createResult = await createContainer()
      if (createResult.success) {
        return { available: true, running: true }
      }
      return {
        available: false,
        running: false,
        message: `No se pudo recrear contenedor: ${createResult.error}`,
      }
    }

    // Container exists but not running
    if (await containerExists()) {
      // Check if mount is correct
      if (await hasCorrectMount()) {
        console.log("Arrancando contenedor Kali...")
        const startResult = await startContainer()
        if (startResult.success) {
          return { available: true, running: true }
        }
        return {
          available: false,
          running: false,
          message: `No se pudo arrancar contenedor: ${startResult.error}`,
        }
      }

      // Need to recreate with correct mount
      console.log("Recreando contenedor Kali...")
      await removeContainer()
      const createResult = await createContainer()
      if (createResult.success) {
        return { available: true, running: true }
      }
      return {
        available: false,
        running: false,
        message: `No se pudo crear contenedor: ${createResult.error}`,
      }
    }

    // Container doesn't exist, create it
    console.log("Creando contenedor Kali...")
    const createResult = await createContainer()
    if (createResult.success) {
      return { available: true, running: true }
    }
    return {
      available: false,
      running: false,
      message: `No se pudo crear contenedor: ${createResult.error}`,
    }
  }

  /**
   * Check and start container at startup. Exits the process if container cannot be started.
   * This ensures opencode cannot run without the SACIA Kali container.
   */
  export async function requireAtStartup(): Promise<void> {
    // Skip if explicitly disabled
    if (process.env.SACIA_DISABLE_DOCKER === "true") {
      log.info("SACIA Docker disabled by environment variable")
      process.env.SACIA_EXECUTOR = "local"
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
