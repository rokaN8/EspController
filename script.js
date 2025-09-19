class ESP32Controller {
    constructor() {
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.isConnected = false;
        
        // BLE service UUIDs
        this.serviceUUID = '12345678-1234-1234-1234-123456789abc';
        this.characteristicUUID = '87654321-4321-4321-4321-cba987654321';
        
        // Test mode with standard service (for debugging)
        this.testMode = false;
        this.testServiceUUID = '0000180f-0000-1000-8000-00805f9b34fb'; // Battery Service
        
        // LED Grid state (30 LEDs: 0=Off, 1=Red, 2=Green, 3=Blue)
        this.ledStates = new Array(30).fill(0);
        this.colorNames = ['off', 'red', 'green', 'blue'];
        this.colorValues = [0, 1, 2, 3];

        // Disco mode state
        this.discoModeActive = false;
        this.discoInterval = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.createLEDGrid();
        this.updateUI();
    }

    initializeElements() {
        this.statusElement = document.getElementById('status');
        this.connectBtn = document.getElementById('connectBtn');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        
        // LED Grid elements
        this.ledGrid = document.getElementById('ledGrid');
        this.sendGridBtn = document.getElementById('sendGridBtn');
        this.clearGridBtn = document.getElementById('clearGridBtn');
        this.testLEDsBtn = document.getElementById('testLEDsBtn');
        this.discoBtn = document.getElementById('discoBtn');
    }

    attachEventListeners() {
        this.connectBtn.addEventListener('click', () => this.connect());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        
        // LED Grid event listeners
        this.sendGridBtn.addEventListener('click', () => this.sendLEDConfiguration());
        this.clearGridBtn.addEventListener('click', () => this.clearLEDGrid());
        this.testLEDsBtn.addEventListener('click', () => this.testLEDs());
        this.discoBtn.addEventListener('click', () => this.toggleDiscoMode());
    }

    updateStatus(message, type = 'disconnected') {
        this.statusElement.textContent = message;
        this.statusElement.className = `status ${type}`;
    }

    updateUI() {
        this.connectBtn.disabled = this.isConnected;
        this.disconnectBtn.disabled = !this.isConnected;
        this.sendGridBtn.disabled = !this.isConnected || this.discoModeActive;
        this.testLEDsBtn.disabled = !this.isConnected || this.discoModeActive;
        this.discoBtn.disabled = !this.isConnected;

        if (this.isConnected) {
            this.updateStatus('Connected', 'connected');
        } else {
            this.updateStatus('Disconnected', 'disconnected');
        }
    }

    async connect() {
        try {
            // Check for HTTPS/localhost requirement
            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                throw new Error('Web Bluetooth requires HTTPS or localhost. Current URL: ' + location.href);
            }

            if (!navigator.bluetooth) {
                throw new Error('Web Bluetooth is not supported in this browser');
            }

            console.log('Starting BLE connection...');
            console.log('Service UUID:', this.serviceUUID);
            console.log('Characteristic UUID:', this.characteristicUUID);

            this.updateStatus('Scanning for devices...', 'connecting');

            // Try multiple connection strategies
            console.log('Attempting connection with service filter...');
            
            let connectionAttempted = false;
            
            try {
                // Primary method: Filter by service UUID
                this.device = await navigator.bluetooth.requestDevice({
                    filters: [
                        { 
                            name: 'ESP32-LED-Controller'
                         }
                    ],
                    optionalServices: [this.serviceUUID]
                });
                connectionAttempted = true;
            } catch (serviceError) {
                console.warn('Name filter also failed:', nameError);
                throw new Error('Could not find ESP32. Make sure it\'s powered on and in range. Service error: ' + serviceError.message);
            }

            console.log('Device selected:', this.device.name);
            this.updateStatus('Connecting...', 'connecting');

            // Connect to GATT server
            console.log('Connecting to GATT server...');
            this.server = await this.device.gatt.connect();
            console.log('GATT server connected');
            
            // Get our service
            console.log('Getting primary service...');
            this.service = await this.server.getPrimaryService(this.serviceUUID);
            console.log('Service found:', this.service);
            
            // Get our characteristic
            console.log('Getting characteristic...');
            this.characteristic = await this.service.getCharacteristic(this.characteristicUUID);
            console.log('Characteristic found:', this.characteristic);

            // Set up disconnect handler
            this.device.addEventListener('gattserverdisconnected', () => {
                console.log('Device disconnected via GATT');
                this.handleDisconnection();
            });

            this.isConnected = true;
            this.updateUI();
            
            console.log('Successfully connected to ESP32!');
            
        } catch (error) {
            console.error('Detailed connection error:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            
            // Provide specific error guidance
            let errorMsg = error.message;
            if (error.name === 'NotFoundError') {
                errorMsg = 'ESP32 not found. Check if device is powered on and advertising the correct service.';
            } else if (error.name === 'SecurityError') {
                errorMsg = 'Security error. Make sure you\'re using HTTPS or localhost.';
            } else if (error.name === 'NetworkError') {
                errorMsg = 'Network error. Check if ESP32 is in range and not connected to another device.';
            }
            
            this.updateStatus(`Connection failed: ${errorMsg}`, 'disconnected');
            this.isConnected = false;
            this.updateUI();
        }
    }

    async disconnect() {
        try {
            if (this.device && this.device.gatt.connected) {
                await this.device.gatt.disconnect();
            }
            this.handleDisconnection();
        } catch (error) {
            console.error('Disconnect error:', error);
            this.handleDisconnection();
        }
    }

    handleDisconnection() {
        // Stop disco mode if active
        if (this.discoModeActive) {
            this.stopDiscoMode();
        }

        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.isConnected = false;
        this.updateUI();
        console.log('Disconnected from ESP32');
    }



    // LED Grid Management Methods
    createLEDGrid() {
        // Create the LED addressing pattern: snake pattern as specified
        const addressMapping = [
            30, 29, 28, 27, 26,  // Row 6 (top)
            21, 22, 23, 24, 25,  // Row 5
            20, 19, 18, 17, 16,  // Row 4
            11, 12, 13, 14, 15,  // Row 3
            10,  9,  8,  7,  6,  // Row 2
             1,  2,  3,  4,  5   // Row 1 (bottom)
        ];

        this.ledGrid.innerHTML = '';
        
        // Create LED cells in grid order (top to bottom, left to right)
        for (let i = 0; i < 30; i++) {
            const ledCell = document.createElement('div');
            ledCell.className = 'led-cell off';
            ledCell.textContent = addressMapping[i];
            ledCell.dataset.ledIndex = addressMapping[i] - 1; // Convert to 0-based index
            
            ledCell.addEventListener('click', () => {
                this.cycleLEDState(addressMapping[i] - 1);
            });
            
            this.ledGrid.appendChild(ledCell);
        }
        
        console.log('LED Grid created with snake pattern addressing');
    }

    cycleLEDState(ledIndex) {
        // Cycle through: Off(0) -> Red(1) -> Green(2) -> Blue(3) -> Off(0)
        this.ledStates[ledIndex] = (this.ledStates[ledIndex] + 1) % 4;
        this.updateLEDVisual(ledIndex);
        
        console.log(`LED ${ledIndex + 1} set to: ${this.colorNames[this.ledStates[ledIndex]]}`);
    }

    updateLEDVisual(ledIndex) {
        // Find the visual cell that corresponds to this LED index
        const cell = this.ledGrid.querySelector(`[data-led-index="${ledIndex}"]`);
        if (cell) {
            // Remove all color classes
            cell.classList.remove('off', 'red', 'green', 'blue');
            // Add the current state class
            cell.classList.add(this.colorNames[this.ledStates[ledIndex]]);
        }
    }

    clearLEDGrid() {
        // Reset all LEDs to off state
        this.ledStates.fill(0);
        
        // Update all visuals
        for (let i = 0; i < 30; i++) {
            this.updateLEDVisual(i);
        }
        
        console.log('LED Grid cleared - all LEDs set to OFF');
    }

    async sendLEDConfiguration() {
        if (!this.isConnected || !this.characteristic) {
            console.error('Not connected to device');
            return;
        }

        try {
            // Create the LED configuration command
            const ledCommand = {
                type: 'led_grid',
                data: this.ledStates
            };
            
            const commandString = JSON.stringify(ledCommand);
            console.log('Sending LED configuration:', commandString);
            
            // Convert to Uint8Array
            const encoder = new TextEncoder();
            const data = encoder.encode(commandString);
            
            // Send via BLE
            await this.characteristic.writeValue(data);
            
            console.log('LED configuration sent successfully');
            
            // Show feedback
            const originalText = this.sendGridBtn.textContent;
            this.sendGridBtn.textContent = 'Sent!';
            setTimeout(() => {
                this.sendGridBtn.textContent = originalText;
            }, 1500);
            
        } catch (error) {
            console.error('Failed to send LED configuration:', error);
            this.updateStatus('LED command failed', 'disconnected');
        }
    }

    async testLEDs() {
        if (!this.isConnected || !this.characteristic) {
            console.error('Not connected to device');
            return;
        }

        // Disable controls during test
        this.testLEDsBtn.disabled = true;
        this.sendGridBtn.disabled = true;
        this.clearGridBtn.disabled = true;

        const originalText = this.testLEDsBtn.textContent;
        this.testLEDsBtn.textContent = 'Testing...';

        console.log('Starting LED test sequence...');

        try {
            // Test each LED sequentially
            for (let i = 0; i < 30; i++) {
                // Create LED state array with only current LED set to red
                const testLedStates = new Array(30).fill(0);
                testLedStates[i] = 1; // Set current LED to red

                // Create and send command
                const ledCommand = {
                    type: 'led_grid',
                    data: testLedStates
                };

                const commandString = JSON.stringify(ledCommand);
                const encoder = new TextEncoder();
                const data = encoder.encode(commandString);

                await this.characteristic.writeValue(data);
                console.log(`LED ${i + 1} turned on (red)`);

                // Wait 1 second before next LED
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Turn off all LEDs at the end
            const allOffCommand = {
                type: 'led_grid',
                data: new Array(30).fill(0)
            };

            const commandString = JSON.stringify(allOffCommand);
            const encoder = new TextEncoder();
            const data = encoder.encode(commandString);
            await this.characteristic.writeValue(data);

            console.log('LED test sequence completed - all LEDs turned off');

        } catch (error) {
            console.error('LED test failed:', error);
            this.updateStatus('LED test failed', 'disconnected');
        } finally {
            // Re-enable controls
            this.testLEDsBtn.textContent = originalText;
            this.testLEDsBtn.disabled = false;
            this.sendGridBtn.disabled = false;
            this.clearGridBtn.disabled = false;
        }
    }

    // Helper functions for disco mode
    getRandomLEDs(count) {
        const selectedLEDs = [];
        const availableLEDs = Array.from({length: 30}, (_, i) => i);

        for (let i = 0; i < count && availableLEDs.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableLEDs.length);
            selectedLEDs.push(availableLEDs.splice(randomIndex, 1)[0]);
        }

        return selectedLEDs;
    }

    getRandomColor() {
        // Return random color value: 1=Red, 2=Green, 3=Blue
        return Math.floor(Math.random() * 3) + 1;
    }

    async startDiscoMode() {
        if (!this.isConnected || !this.characteristic) {
            console.error('Not connected to device');
            return;
        }

        this.discoModeActive = true;
        this.discoBtn.textContent = 'Stop Disco';

        // Disable other LED controls during disco mode
        this.sendGridBtn.disabled = true;
        this.clearGridBtn.disabled = true;
        this.testLEDsBtn.disabled = true;

        console.log('Starting disco mode...');

        const discoStep = async () => {
            if (!this.discoModeActive) return;

            try {
                // Create LED state array (all off)
                const discoLedStates = new Array(30).fill(0);

                // Get 5 random LEDs and assign random colors
                const randomLEDs = this.getRandomLEDs(5);
                randomLEDs.forEach(ledIndex => {
                    discoLedStates[ledIndex] = this.getRandomColor();
                });

                // Create and send command
                const ledCommand = {
                    type: 'led_grid',
                    data: discoLedStates
                };

                const commandString = JSON.stringify(ledCommand);
                const encoder = new TextEncoder();
                const data = encoder.encode(commandString);

                await this.characteristic.writeValue(data);
                console.log('Disco pattern sent:', randomLEDs);

            } catch (error) {
                console.error('Disco mode error:', error);
                this.stopDiscoMode();
            }
        };

        // Run first pattern immediately, then every 2 seconds
        await discoStep();
        this.discoInterval = setInterval(discoStep, 2000);
    }

    async stopDiscoMode() {
        this.discoModeActive = false;

        if (this.discoInterval) {
            clearInterval(this.discoInterval);
            this.discoInterval = null;
        }

        this.discoBtn.textContent = 'Disco Mode';

        // Re-enable controls
        if (this.isConnected) {
            this.sendGridBtn.disabled = false;
            this.clearGridBtn.disabled = false;
            this.testLEDsBtn.disabled = false;
        }

        // Turn off all LEDs
        if (this.isConnected && this.characteristic) {
            try {
                const allOffCommand = {
                    type: 'led_grid',
                    data: new Array(30).fill(0)
                };

                const commandString = JSON.stringify(allOffCommand);
                const encoder = new TextEncoder();
                const data = encoder.encode(commandString);
                await this.characteristic.writeValue(data);

                console.log('Disco mode stopped - all LEDs turned off');
            } catch (error) {
                console.error('Error turning off LEDs:', error);
            }
        }
    }

    toggleDiscoMode() {
        if (this.discoModeActive) {
            this.stopDiscoMode();
        } else {
            this.startDiscoMode();
        }
    }
}

// Check for Web Bluetooth support
function checkWebBluetoothSupport() {
    if (!navigator.bluetooth) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = 'Web Bluetooth not supported';
        statusElement.className = 'status disconnected';
        
        document.getElementById('connectBtn').disabled = true;
        document.getElementById('connectBtn').textContent = 'Not Supported';
        
        console.error('Web Bluetooth API is not available in this browser');
        return false;
    }
    return true;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    if (checkWebBluetoothSupport()) {
        window.esp32Controller = new ESP32Controller();
        console.log('ESP32 Web Bluetooth Controller initialized');
    }
});

// Service worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Note: You would need to create a service worker file for full offline support
        console.log('Service Worker support detected');
    });
}