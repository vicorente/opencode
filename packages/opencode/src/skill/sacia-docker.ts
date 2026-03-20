import { $ } from "bun"
import { Log } from "../util/log"
import { Flag } from "../flag/flag"

const log = Log.create({ service: "sacia-docker" })

export namespace SaciaDocker {
  const CONTAINER_NAME = "sacia-kali"
  const IMAGE_NAME = "sacia-kali:latest"

  export function isEnabled(): boolean {
    return process.env.SACIA_DISABLE_DOCKER !== "true" && Flag.SACIA_EXECUTOR === "docker-kali"
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

  export async function startContainer(): Promise<boolean> {
    try {
      const exists = await containerExists()

      if (exists) {
        log.info("starting existing container")
        await $`docker start ${CONTAINER_NAME}`.quiet()
        return true
      }

      const hasImage = await imageExists()
      if (!hasImage) {
        log.warn("sacia-kali image not found")
        log.info("run: ~/.sacia/docker/sacia-kali.sh build")
        return false
      }

      const home = process.env.HOME || "/root"
      log.info("creating container from image")
      await $`docker run -d \
        --name ${CONTAINER_NAME} \
        -v ${home}/.sacia/workspace:/workspace/project \
        -v /var/run/docker.sock:/var/run/docker.sock \
        --network host \
        --cap-add=NET_ADMIN \
        --restart unless-stopped \
        ${IMAGE_NAME}`.quiet()

      return true
    } catch (error) {
      log.error("failed to start container", { error })
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

    log.info("container not running, attempting to start...")
    const started = await startContainer()

    if (started) {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const nowRunning = await isContainerRunning()
      if (nowRunning) {
        return { available: true, running: true }
      }
    }

    const exists = await containerExists()
    const hasImage = await imageExists()

    let message: string
    if (!hasImage) {
      message = `Imagen SACIA no encontrada. Ejecuta:
  ~/.sacia/docker/sacia-kali.sh build`
    } else if (!exists) {
      message = `No se pudo crear el contenedor. Ejecuta:
  ~/.sacia/docker/sacia-kali.sh start`
    } else {
      message = `No se pudo iniciar el contenedor. Ejecuta:
  ~/.sacia/docker/sacia-kali.sh restart`
    }

    return { available: false, running: false, message }
  }
}
