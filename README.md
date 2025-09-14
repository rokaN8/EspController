# ESP32 Web Bluetooth Controller

A simple web application that uses Web Bluetooth API to connect to an ESP32 and send ON/OFF commands. Works on both desktop and mobile devices.

## Project Structure

```
webui/
├── index.html          # Web Bluetooth UI
├── style.css           # Minimal responsive styling  
├── script.js           # Web Bluetooth API logic
└── README.md           # This file

board/
└── board.ino           # ESP32 Arduino code
```

## Features

- **Offline Web UI** - No server required, works completely offline
- **Device Pairing** - Scan and connect to ESP32 via Web Bluetooth
- **Simple Control** - Single ON/OFF toggle button
- **Responsive Design** - Works on desktop and mobile browsers
- **Connection Status** - Visual indicators for connection state
- **Auto-reconnection** - ESP32 restarts advertising after disconnect

## Requirements

### Web UI
- **Browser**: Chrome or Edge (Web Bluetooth API support required)
- **Connection**: HTTPS or localhost (Web Bluetooth security requirement)
- **Platform**: Windows, macOS, Linux, Android, iOS (in supported browsers)

### ESP32
- **Board**: ESP32 development board (any variant)
- **Arduino IDE**: Version 1.8.x or 2.x
- **Libraries**: ESP32 BLE Arduino library (included with ESP32 board package)

## Setup Instructions

### 1. ESP32 Setup

1. **Install ESP32 Board Package**:
   - Open Arduino IDE
   - Go to `File > Preferences`
   - Add this URL to "Additional Board Manager URLs":
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to `Tools > Board > Boards Manager`
   - Search for "ESP32" and install the package

2. **Upload Code**:
   - Open `board/board.ino` in Arduino IDE
   - Select your ESP32 board: `Tools > Board > ESP32 Arduino > [Your Board]`
   - Select correct port: `Tools > Port > [Your ESP32 Port]`
   - Click "Upload" button
   - Open Serial Monitor (115200 baud) to see connection status

3. **Verify Operation**:
   - Serial Monitor should show: "Device is now discoverable as 'ESP32-Controller'"
   - Built-in LED should blink slowly (waiting for connection)

### 2. Web UI Setup

#### Option A: Local Server (Recommended)
**Why needed**: Web Bluetooth requires HTTPS or localhost. Opening HTML files directly uses `file://` protocol which doesn't work.

1. **Start Local Python Server**:
   ```bash
   # Navigate to the webui directory
   cd /path/to/webui
   
   # Python 3 (most common)
   python -m http.server 8000
   
   # Alternative: Python 2 (if needed)
   python2 -m SimpleHTTPServer 8000
   
   # Windows with py launcher
   py -m http.server 8000
   ```

2. **Access Web Application**:
   - Open browser and go to: `http://localhost:8000`
   - **For mobile testing**: Use your computer's IP address: `http://192.168.1.XXX:8000`

#### Option B: Alternative Local Servers
```bash
# Node.js (if installed)
npx serve . -p 8000

# VS Code Live Server Extension
# Right-click index.html -> "Open with Live Server"
```

#### Option C: Direct File (Limited Functionality)
- Double-click `index.html` (may not work due to HTTPS requirement)
- Use only for initial testing

### 3. Connect and Control

1. **Connect to ESP32**:
   - Click "Connect to ESP32" button
   - Select "ESP32-LED-Controller" from device list
   - Status should change to "Connected"

2. **Control LED Grid**:
   - Click grid squares to cycle colors: Off → Red → Green → Blue
   - Click "Send Configuration" to update LED strip
   - Use "Clear All" to reset all LEDs to off

## Pin Configuration

### Default Configuration
- **LED Pin**: GPIO 2 (built-in LED on most ESP32 boards)

### Common ESP32 Board Variants

| Board Type | Built-in LED Pin | Notes |
|------------|------------------|-------|
| ESP32 DevKit | GPIO 2 | Most common |
| ESP32-WROOM-32 | GPIO 2 | Standard |
| ESP32-S2 | GPIO 15 | Change LED_PIN in code |
| ESP32-C3 | GPIO 8 | Change LED_PIN in code |
| ESP32-S3 | GPIO 48 | Change LED_PIN in code |

### Custom Pin Configuration
To use a different pin, modify this line in `board.ino`:
```cpp
#define LED_PIN 2  // Change to your desired pin number
```

## Library Requirements

### ESP32 (Arduino IDE)
The following libraries are automatically included with the ESP32 board package:
- `BLEDevice.h` - Core BLE functionality
- `BLEServer.h` - BLE server implementation
- `BLEUtils.h` - BLE utilities
- `BLE2902.h` - BLE descriptor support

### Web UI
No additional libraries required - uses native Web APIs:
- Web Bluetooth API (built into Chrome/Edge)
- Standard HTML/CSS/JavaScript

## Debugging and Development

### Local Server Setup for Development

**Problem**: Web Bluetooth only works over HTTPS or localhost. Opening `index.html` directly uses `file://` protocol which fails.

**Solution**: Use a local HTTP server to serve the web application.

#### Quick Setup (Python)
```bash
# Navigate to the webui directory
cd /path/to/your/webui

# Start Python HTTP server (most common method)
python -m http.server 8000

# Alternative commands:
python3 -m http.server 8000     # Explicit Python 3
python2 -m SimpleHTTPServer 8000 # Python 2 (legacy)
py -m http.server 8000           # Windows py launcher
```

#### Access the Application
- **Local testing**: `http://localhost:8000`
- **Mobile testing**: `http://YOUR_COMPUTER_IP:8000` (e.g., `http://192.168.1.100:8000`)
- **Find your IP**: 
  - Windows: `ipconfig`
  - Mac/Linux: `ifconfig` or `ip addr`

#### Alternative Local Servers
```bash
# Node.js (if installed)
npx serve . -p 8000
npx http-server -p 8000

# PHP (if installed)
php -S localhost:8000

# VS Code Live Server Extension
# Right-click index.html -> "Open with Live Server"
```

#### Firewall and Network Access
- **Windows Firewall**: Allow Python through firewall when prompted
- **Mobile Access**: Ensure both devices are on same WiFi network
- **Port Issues**: Try different ports if 8000 is busy (8080, 3000, 5000)

### Browser Console Debugging

1. **Open Developer Tools**: Press `F12` or right-click → Inspect
2. **Go to Console Tab**: Look for error messages
3. **Test BLE Support**: Click "Test BLE Connection" button first
4. **Common Console Messages**:
   ```javascript
   // Good - BLE is working
   "Starting BLE connection..."
   "Device selected: ESP32-LED-Controller"
   "Successfully connected to ESP32!"
   
   // Errors to look for
   "Web Bluetooth requires HTTPS or localhost"
   "NotFoundError: ESP32 not found"
   "SecurityError: User cancelled the requestDevice() chooser"
   ```

### Mobile Device Testing

1. **Enable Web Bluetooth** (Chrome/Edge mobile):
   - Type `chrome://flags` in address bar
   - Search "bluetooth"
   - Enable "Experimental Web Platform features"

2. **Connect to Local Server**:
   - Find computer's IP address on same WiFi network
   - Visit `http://COMPUTER_IP:8000` on mobile browser

## Troubleshooting

### Web UI Issues

**"Web Bluetooth not supported"**
- Use Chrome or Edge browser
- Update to latest browser version
- On mobile, ensure Web Bluetooth is enabled in browser flags

**"Connection failed"**
- Ensure ESP32 is powered on and running the code
- Check that ESP32 is advertising (Serial Monitor shows "Device is now discoverable")
- Try refreshing the web page and reconnecting
- Clear browser cache if previously paired

**Device not appearing in scan**
- Verify ESP32 code uploaded successfully
- Check Serial Monitor for error messages
- Ensure ESP32 is not connected to another device
- Try restarting ESP32

### ESP32 Issues

**Code won't compile**
- Ensure ESP32 board package is installed
- Select correct board type in Tools > Board
- Install latest ESP32 board package version

**BLE not working**
- Check if your ESP32 variant supports BLE (most do)
- Verify correct ESP32 board selected in Arduino IDE
- Check Serial Monitor for initialization errors

**LED not responding**
- Verify LED_PIN matches your board's built-in LED
- Check wiring if using external LED
- Monitor Serial output to confirm commands are received

### Connection Issues

**Frequent disconnections**
- Keep devices within close range (< 10 meters)
- Avoid interference from other BLE devices
- Check ESP32 power supply stability

**Commands not working**
- Verify UUIDs match between web UI and ESP32 code
- Check Serial Monitor for received command confirmation
- Ensure characteristic has WRITE property enabled

## Customization

### Adding More Commands
1. **Web UI**: Add new buttons and modify the `toggle()` function in `script.js`
2. **ESP32**: Extend the command processing in the `MyCallbacks::onWrite()` function

### External Components
Replace the LED with:
- Relays for high-power devices
- Servos for movement control
- RGB LEDs for color control
- Sensors for data reading

### Security Notes
- This implementation is for demonstration/development use
- For production use, consider adding authentication
- Web Bluetooth requires HTTPS for security

## Technical Details

### BLE Configuration
- **Service UUID**: `12345678-1234-1234-1234-123456789abc`
- **Characteristic UUID**: `87654321-4321-4321-4321-cba987654321`
- **Device Name**: `ESP32-Controller`
- **Commands**: `"1"` (ON), `"0"` (OFF)

### Browser Compatibility
- Chrome: Full support
- Edge: Full support  
- Firefox: Limited support (enable flags)
- Safari: Not supported
- Mobile Chrome/Edge: Full support

## License

This project is provided as-is for educational and development purposes.