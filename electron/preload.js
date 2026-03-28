const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('yourApi', {
    // Define your API methods here
});