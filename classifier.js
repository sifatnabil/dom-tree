const spawn = require("child_process").spawn;
const pythonProcess = spawn('python',["./classifier.py", "hello world"]);

pythonProcess.stdout.on('data', (data) => {
    console.log(data.toString());
});