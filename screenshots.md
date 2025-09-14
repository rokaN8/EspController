# Screenshot Template for ESP32 LED Grid Controller

This file serves as a template for the screenshots you need to take. Once you capture the images, save them in the specified locations and they will automatically appear in the README.

## Required Screenshots

### 1. Web Interface Screenshot
**Filename:** `screenshots/web-interface.png`
**What to capture:**
- Open the web application in Chrome/Edge browser
- Ensure you're connected to the ESP32 (status shows "Connected")
- Set some LEDs to different colors (red, green, blue) to show functionality
- Include the full interface:
  - Header with connection status
  - Connection buttons (Connect, Disconnect, Test)
  - LED Grid with some colored squares
  - Control buttons (Send Configuration, Clear All)
  - Instructions and requirements sections

### 2. Hardware Front View
**Filename:** `screenshots/hardware-front.png`
**What to capture:**
- Front view of your 5x6 LED grid setup
- Show the physical arrangement of 30 LEDs
- If possible, have some LEDs lit in different colors to match the web interface
- Include the ESP32 board in the shot if visible
- Show the overall setup clearly

### 3. Hardware Back View
**Filename:** `screenshots/hardware-back.png`
**What to capture:**
- Back/side view showing wiring connections
- ESP32 board clearly visible
- Connections between ESP32 and LED strip (data pin, power, ground)
- Power supply connections if using external power
- Any breadboard or connection setup
- Focus on the technical implementation

## Directory Structure to Create

```
screenshots/
├── web-interface.png
├── hardware-front.png
└── hardware-back.png
```

## Tips for Good Screenshots

### Web Interface:
- Use full browser window
- Ensure good contrast and readability
- Show a realistic usage scenario (not all LEDs the same color)
- Include browser address bar showing localhost/HTTPS

### Hardware:
- Good lighting for clear visibility
- Stable camera position
- Show scale (include common objects for size reference if helpful)
- Focus on the technical details that users need to see
- Multiple angles if one shot doesn't show everything clearly

## After Taking Screenshots

1. Create the `screenshots/` directory
2. Save the images with the exact filenames above
3. The images will automatically appear in the README.md file
4. You can delete this template file once screenshots are added

## Image Specifications

- **Format:** PNG recommended (better quality for technical screenshots)
- **Resolution:** High enough to see details clearly (minimum 800px width)
- **File size:** Keep reasonable for GitHub (<2MB per image)
- **Compression:** Balance between quality and file size