const app = require('./api/index');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Hebrew RTL ePaper Server running locally on port ${PORT}`);
  console.log(`Control Panel: http://localhost:${PORT}/`);
  console.log(`ePaper PNG API: http://localhost:${PORT}/api/screen`);
  console.log(`====================================================`);
});
