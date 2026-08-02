const { exec } = require('child_process');

const cmd = `python -m esptool --chip esp32c3 --port COM7 --before default-reset run`;

console.log('=========================================');
console.log('    COM7 AUTO-RESET TRIGGER LOOP         ');
console.log('=========================================');
console.log('Listening for device connection...');

function attempt() {
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      // Loop quickly to catch the boot window
      setTimeout(attempt, 500);
    } else {
      console.log('\n=========================================');
      console.log('      RESET TRIGGERED SUCCESSFULLY!      ');
      console.log('=========================================');
      process.exit(0);
    }
  });
}

attempt();
