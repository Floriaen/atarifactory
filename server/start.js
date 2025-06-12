const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = require('./index');
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 