import { Flag } from "@/flag/flag"
import { Instance } from "@/project/instance"
import { Shell } from "@/shell/shell"
import { Log } from "@/util/log"
import { spawn, type ChildProcess } from "child_process"
import path from "path"

export namespace Executor {
  const log = Log.create({ service: "executor" })

  type Opts = {
    command: string
    cwd: string
    env?: Record<string, string>
  }

  export function mode(): "docker-kali" | "local" {
    // If explicitly set, use that
    if (Flag.SACIA_EXECUTOR === "docker-kali") return "docker-kali"
    if (Flag.SACIA_EXECUTOR === "local") return "local"
    // Default: use docker-kali if not disabled
    if (process.env.SACIA_DISABLE_DOCKER === "true") return "local"
    return "docker-kali"
  }

  export function run(opts: Opts): ChildProcess {
    const backend = mode()
    const forceLocal = backend === "docker-kali" && localnet(opts.command)
    const preview = opts.command.replace(/\s+/g, " ").trim().slice(0, 160)

    if (backend === "docker-kali" && !forceLocal) {
      log.info("routing command", { backend: "docker-kali", cwd: opts.cwd, command: preview })
      return docker(opts)
    }

    log.info("routing command", {
      backend: "local",
      reason: forceLocal ? "hybrid-local-network-rule" : "default-local-mode",
      cwd: opts.cwd,
      command: preview,
    })

    return spawn(opts.command, {
      shell: Shell.acceptable(),
      cwd: opts.cwd,
      env: {
        ...process.env,
        ...opts.env,
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    })
  }

  /**
   * Run command asynchronously, returns stdout
   */
  export async function exec(opts: Opts): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const proc = run(opts)
      let stdout = ""
      let stderr = ""

      proc.stdout?.on("data", (data) => {
        stdout += data.toString()
      })

      proc.stderr?.on("data", (data) => {
        stderr += data.toString()
      })

      proc.on("close", (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? 0,
        })
      })

      proc.on("error", (err) => {
        resolve({
          stdout: "",
          stderr: err.message,
          exitCode: 1,
        })
      })
    })
  }

  function localnet(command: string) {
    if (Flag.SACIA_EXECUTOR_NETWORK !== "hybrid") return false
    const cmd = command.toLowerCase()
    if (/\b(arp|arp-scan|arpscan|tcpdump|ettercap|bettercap|airodump-ng|iwconfig|ip\s+neigh|ip\s+link)\b/.test(cmd)) {
      return true
    }
    if (/\bnmap\b/.test(cmd) && /(^|\s)-sn(\s|$)/.test(cmd)) {
      return true
    }
    return false
  }

  function docker(opts: Opts): ChildProcess {
    const ctr = Flag.SACIA_KALI_CONTAINER || SaciaDocker.CONTAINER_NAME
    const root = Flag.SACIA_KALI_WORKSPACE || SaciaDocker.WORKSPACE_ROOT
    const cwd = map(opts.cwd, root)
    const vars = {
      PATH: "/root/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      ...(opts.env || {}),
    }
    const env = Object.entries(vars).flatMap(([k, v]) => ["-e", `${k}=${v}`])

    return spawn(
      "docker",
      ["exec", "-i", "-w", cwd, ...env, ctr, "/bin/bash", "-lc", opts.command],
      {
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
      },
    )
  }

  function map(cwd: string, root: string) {
    if (cwd === Instance.directory) return root
    const rel = path.relative(Instance.directory, cwd)
    if (rel.startsWith("..") || path.isAbsolute(rel)) return cwd
    const posix = rel.split(path.sep).join("/")
    return path.posix.join(root, posix)
  }
}

// Import after namespace to avoid circular dependency
import { SaciaDocker } from "@/skill/sacia-docker"

