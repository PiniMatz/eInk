const { exec, execSync } = require('child_process');

console.log('==================================================');
console.log('   AUTOMATED PORT DETECTION & FIRMWARE UPLOADER  ');
console.log('==================================================');

// Helper to get active ports
function getActivePort() {
  try {
    const output = execSync('powershell "Get-WmiObject Win32_PnPEntity | Where-Object { $_.Name -like \\"*COM*\\" } | Select-Object Name"').toString();
    const matches = output.match(/COM\d+/g) || [];
    return matches.find(p => !['COM3', 'COM4', 'COM5', 'COM6'].includes(p));
  } catch (err) {
    return null;
  }
}

const initialPort = getActivePort();
if (initialPort) {
  console.log(`Port ${initialPort} is currently connected. Please unplug the device first!`);
} else {
  console.log('No active device detected. Ready to connect. Please hold BOOT and plug it in...');
}

let deviceUnplugged = !initialPort;

const interval = setInterval(() => {
  const currentPort = getActivePort();
  
  if (!deviceUnplugged) {
    if (!currentPort) {
      console.log('Device unplugged successfully! Please hold BOOT and plug it back in...');
      deviceUnplugged = true;
    }
    return;
  }
  
  if (currentPort) {
    console.log(`\n>>> Found active board on port: ${currentPort}!`);
    console.log('>>> Starting flash sequence immediately...');
    clearInterval(interval);
    
    const firmwarePath = "C:\\Users\\pini_\\Documents\\Private\\Pini\\AntiGravity\\eInk\\esphome\\.esphome\\build\\epaper-calendar\\.pioenvs\\epaper-calendar\\firmware.bin";
    const bootloaderPath = "C:\\Users\\pini_\\Documents\\Private\\Pini\\AntiGravity\\eInk\\esphome\\.esphome\\build\\epaper-calendar\\.pioenvs\\epaper-calendar\\bootloader.bin";
    const partitionsPath = "C:\\Users\\pini_\\Documents\\Private\\Pini\\AntiGravity\\eInk\\esphome\\.esphome\\build\\epaper-calendar\\.pioenvs\\epaper-calendar\\partitions.bin";
    const otaInitPath = "C:\\Users\\pini_\\Documents\\Private\\Pini\\AntiGravity\\eInk\\esphome\\.esphome\\build\\epaper-calendar\\.pioenvs\\epaper-calendar\\ota_data_initial.bin";

    // Use default-reset at 460800 baud for fast upload before brownouts/timeouts can occur
    const cmd = `python -m esptool --chip esp32c3 --before default-reset --after hard-reset --port ${currentPort} --baud 460800 --connect-attempts 20 write-flash -z --flash-size detect 0x10000 "${firmwarePath}" 0x0 "${bootloaderPath}" 0x8000 "${partitionsPath}" 0x9000 "${otaInitPath}"`;

    console.log(`Executing: ${cmd}\n`);
    const flash = exec(cmd);
    
    flash.stdout.pipe(process.stdout);
    flash.stderr.pipe(process.stderr);
    
    flash.on('close', (code) => {
      if (code === 0) {
        console.log('\n==================================================');
        console.log('       FIRMWARE FLASHED SUCCESSFULLY!            ');
        console.log('==================================================');
        process.exit(0);
      } else {
        console.error(`\n[ERROR] Flashing failed with exit code: ${code}`);
        process.exit(1);
      }
    });
  }
}, 1000);
