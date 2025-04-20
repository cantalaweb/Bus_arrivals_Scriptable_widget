## Introduction
This creates an iOS widget, which displays the next 3 bus arrivals for the bus stop closest to the user. It uses the data for the municipal bus service (EMT) for the city of Valencia (Spain).
![./home_screen.png]

## Requirements
- [Scriptable](https://scriptable.app) must be installed in your iOS device.

## Installation
1. Save the `EMT.js` file to the `/Scriptable` folder inside your iCloud Drive folder.
2. Save the  `/EMT_Valencia` folder to the `/Scriptable` folder inside your iCloud Drive folder.
3. In the Scriptable settings, create a folder bookmark that points to the `/EMT_Valencia` folder. The bookmark name must be EMT_Valencia.
4. You can now launch the `EMT.js` script from the Scriptable app, to see it works.
5. Go to the home screen in which you want to create the widget.
6. Tap and hold in an empty area of the screen, until everything starts to wiggle.
7. Tap the Edit button at the top left of the screen and select Add widget.
8. Search for Scriptable and select it.
9. Tap the Add widget at the bottom.
10. Adjust its size to the medium size (it should span the entire width of the screen, but remaining as small as possible in height).
11. Tap inside the wiggling widget you just created.
12. Tap the Edit widget option.
13. Scroll down and select the EMT script.
14. Choose 'Run Script' instead of 'Open App' in the `When interacting' field.
15. Tap outside to go back to your home screen.
16. In a few seconds you should see which bus stop is closest to you, and the next 3 buses arriving to that bus stop.

## Caveats
- It is not possible to refresh the data once a minute. Apple determines its refresh rate, which is normally every few minutes. So to make it usable, the user can tap on the widget to run the script from Scriptable. After that, if you go back to your home screen, the widget will be showing the updated information.
- The publicly available `/EMT_Valencia/emt.json` file is almost 500 KB in size. That is apparently too much for iOS widgets, and the script would crash upon reading the file. That is why the `reduce_emt_data.py` Python script is provided. upon launch, it will read the `emt.json` file and output only the necessary information distributed in 10 files: `emt_1.json` to `emt_10.json`. Those files are the ones the widget reads, one by one, when determining the closest bus stop.



