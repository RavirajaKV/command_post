const os = require("os");
const fs = require("fs");
const process = require("process");
const { exec } = require("child_process");

// Get RAM usage
const totalRAM = os.totalmem() / (1024 ** 3); // Convert to GB
const freeRAM = os.freemem() / (1024 ** 3);
const usedRAM = totalRAM - freeRAM;

// Get CPU usage
function getCPUUsage() {
    return new Promise((resolve) => {
        const startUsage = process.cpuUsage();
        setTimeout(() => {
            const endUsage = process.cpuUsage(startUsage);
            const userCPU = (endUsage.user / 1e6).toFixed(2); // Convert to milliseconds
            const systemCPU = (endUsage.system / 1e6).toFixed(2);
            resolve({ userCPU, systemCPU });
        }, 1000);
    });
}

// Get Free Disk Space
function getDiskSpace() {
    return new Promise((resolve, reject) => {
        exec("df -h /", (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            const lines = stdout.split("\n");
            const diskInfo = lines[1].split(/\s+/);
            resolve({ total: diskInfo[1], used: diskInfo[2], free: diskInfo[3] });
        });
    });
}

// Get GPU Usage (Requires 'nvidia-smi' command, works on NVIDIA GPUs)
function getGPUUsage() {
    return new Promise((resolve, reject) => {
        exec("nvidia-smi --query-gpu=memory.used,memory.free --format=csv,noheader,nounits", (error, stdout) => {
            if (error) {
                resolve("NVIDIA GPU not found or command unavailable");
                return;
            }
            const [used, free] = stdout.trim().split(", ").map(v => `${(v / 1024).toFixed(2)} GB`);
            resolve({ usedGPU: used, freeGPU: free });
        });
    });
}

// Run all checks
(async () => {
    const cpuUsage = await getCPUUsage();
    const diskSpace = await getDiskSpace();
    const gpuUsage = await getGPUUsage();

    console.log("=== System Stats ===");
    console.log(`Used RAM: ${usedRAM.toFixed(2)} GB`);
    console.log(`Free RAM: ${freeRAM.toFixed(2)} GB`);
    console.log(`CPU Usage: User: ${cpuUsage.userCPU} ms, System: ${cpuUsage.systemCPU} ms`);
    console.log(`Disk Space: Total: ${diskSpace.total}, Free: ${diskSpace.free}, Used: ${diskSpace.used}`);
    console.log(`GPU Usage: ${JSON.stringify(gpuUsage)}`);
})();