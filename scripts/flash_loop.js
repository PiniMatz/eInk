const { exec } = require('child_process');

const firmwarePath = "C:\\Users\\pini_\\Documents\\Private\\Pini\\AntiGravity\\eInk\\esphome\\.esphome\\build\\epaper-calendar\\.pioenvs\\epaper-calendar\\firmware.bin";
const bootloaderPath = "C:\\Users\\pini_\\Documents\\Private\\Pini\\AntiGravity\\eInk\\esphome\\.esphome\\build\\epaper-calendar\\.pioenvs\\epaper-calendar\\bootloader.bin";
const partitionsPath = "C:\\Users\\pini_\\Documents\\Private\\Pini\\AntiGravity\\eInk\\esphome\\.esphome\\build\\epaper-calendar\\.pioenvs\\epaper-calendar\\partitions.bin";
const otaInitPath = "C:\\Users\\pini_\\Documents\\Private\\Pini\\AntiGravity\\eInk\\esphome\\.esphome\\build\\epaper-calendar\\.pioenvs\\epaper-calendar\\ota_data_initial.bin";

const cmd = `python -m esptool --chip esp32c3 --before default-reset --after hard-reset --port COM7 --baud 460800 write-flash -z --flash-size detect 0x10000 "${firmwarePath}" 0x0 "${bootloaderPath}" 0x8000 "${partitionsPath}" 0x9000 "${otaInitPath}"`;

console.log('=========================================');
console.log('    COM7 PERSISTENT LOOP UPLOADER        ');
console.log('=========================================');
console.log('Instructions:');
console.log('1. Unplug the USB cable.');
console.log('2. Hold the BOOT button down firmly.');
console.log('3. Plug the USB cable back in.');
console.log('4. Release the BOOT button.');
console.log('-----------------------------------------');

function attempt() {
  console.log('\n>>> Connecting to COM7...');
  
  const flash = exec(cmd);
  flash.stdout.pipe(process.stdout);
  flash.stderr.pipe(process.stderr);
  
  flash.on('close', (code) => {
    if (code === 0) {
      console.log('\n=========================================');
      console.log('     FIRMWARE FLASHED SUCCESSFULLY!      ');
      console.log('=========================================');
      process.exit(0);
    } else {
      console.log('Connection failed. Retrying in 1.5 seconds...');
      setTimeout(attempt, 1500);
    }
  });
}

attempt();
