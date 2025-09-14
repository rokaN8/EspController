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
        
        this.initializeElements();
        this.attachEventListeners();
        this.createLEDGrid();
        this.updateUI();
    }

    initializeElements() {
        this.statusElement = document.getElementById('status');
        this.connectBtn = document.getElementById('connectBtn');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        this.testBtn = document.getElementById('testBtn');
        
        // LED Grid elements
        this.ledGrid = document.getElementById('ledGrid');
        this.sendGridBtn = document.getElementById('sendGridBtn');
        this.clearGridBtn = document.getElementById('clearGridBtn');
    }

    attachEventListeners() {
        this.connectBtn.addEventListener('click', () => this.connect());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.testBtn.addEventListener('click', () => this.testBLEConnection());
        
        // LED Grid event listeners
        this.sendGridBtn.addEventListener('click', () => this.sendLEDConfiguration());
        this.clearGridBtn.addEventListener('click', () => this.clearLEDGrid());
    }

    updateStatus(message, type = 'disconnected') {
        this.statusElement.textContent = message;
        this.statusElement.className = `status ${type}`;
    }

    updateUI() {
        this.connectBtn.disabled = this.isConnected;
        this.disconnectBtn.disabled = !this.isConnected;
        this.sendGridBtn.disabled = !this.isConnected;
        
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
                console.warn('Service filter failed:', serviceError);
                console.log('Trying fallback method: device name filter...');
                
                // Fallback method: Filter by device name
                try {
                    this.device = await navigator.bluetooth.requestDevice({
                        filters: [
                            { name: 'ESP32-LED-Controller' }
                        ],
                        optionalServices: [this.serviceUUID]
                    });
                    connectionAttempted = true;
                } catch (nameError) {
                    console.warn('Name filter also failed:', nameError);
                    throw new Error('Could not find ESP32. Make sure it\'s powered on and in range. Service error: ' + serviceError.message);
                }
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
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.isConnected = false;
        this.updateUI();
        console.log('Disconnected from ESP32');
    }


    async testBLEConnection() {
        try {
            console.log('=== Testing Basic BLE Functionality ===');
            
            // Check for HTTPS/localhost requirement
            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                throw new Error('Web Bluetooth requires HTTPS or localhost. Current URL: ' + location.href);
            }

            if (!navigator.bluetooth) {
                throw new Error('Web Bluetooth is not supported in this browser');
            }

            this.updateStatus('Testing BLE connection...', 'connecting');
            console.log('Attempting to connect to any BLE device...');

            // Try to connect to any available BLE device for testing
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['battery_service', 'device_information']
            });

            console.log('Test device found:', device.name || 'Unnamed device');
            console.log('Device ID:', device.id);
            
            // Try to connect
            const server = await device.gatt.connect();
            console.log('GATT server connected successfully');
            
            // Get services
            const services = await server.getPrimaryServices();
            console.log('Available services:', services.length);
            services.forEach((service, index) => {
                console.log(`Service ${index + 1}: ${service.uuid}`);
            });

            await device.gatt.disconnect();
            
            this.updateStatus('BLE test successful!', 'connected');
            setTimeout(() => {
                if (!this.isConnected) {
                    this.updateStatus('Disconnected', 'disconnected');
                }
            }, 3000);

            console.log('=== BLE Test Completed Successfully ===');
            console.log('Your browser supports Web Bluetooth. The issue is likely with the ESP32 service configuration.');
            
        } catch (error) {
            console.error('BLE test failed:', error);
            this.updateStatus(`BLE test failed: ${error.message}`, 'disconnected');
        }
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