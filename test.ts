await fetch('http://localhost:3000/api/test-error').then(r => r.text()).then(console.log).catch(console.error);
