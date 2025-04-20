// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-gray; icon-glyph: magic;


const TESTMODE = false

let currentLocation = {
  latitude: 39.4583,
  longitude: -0.336
}

/*let testBusStop = [
  {
    "codvia": 40230.0,
    "denominacion": "Les Naus (1591)",
    "geo_point_2d": {
        "lat": 39.45880295716435,
        "lon": -0.3361082784691865
    },
    "geo_shape": {
        "geometry": {
            "coordinates": [
                -0.3361082784691865,
                39.45880295716435
            ],
            "type": "Point"
        },
        "properties": {},
        "type": "Feature"
    },
    "id_parada": 1591.0,
    "lineas": "19,30,4,92,N8",
    "numportal": "34 (DAVANT)",
    "proximas_llegadas": "http://www.emtvalencia.es/QR.php?sec=est&p=1591",
    "suprimida": 0
  }
]*/

async function getStops(filename) {
  const fm = FileManager.iCloud()
  const emtJsonFilePath = fm.bookmarkedPath("EMT_Valencia") + `/${filename}`
  await fm.downloadFileFromiCloud(emtJsonFilePath)
  const text = fm.read(emtJsonFilePath)
  const rawString = text.toRawString()
  return JSON.parse(rawString)
}

const getCurrentLocation = async function() {
  try {
    const loc = await Location.current()
    return loc
  } catch (e) {
    console.error('Location services are not enabled')
    return null
  }
}

// Convert Degress to Radians
function Deg2Rad(deg) {
  return deg * Math.PI / 180
}

// Taken from https://stackoverflow.com/questions/21279559/geolocation-closest-locationlat-long-from-my-position
// See also http://www.movable-type.co.uk/scripts/latlong.html
function PythagorasEquirectangular(lat1, lon1, lat2, lon2) {
  lat1 = Deg2Rad(lat1)
  lat2 = Deg2Rad(lat2)
  lon1 = Deg2Rad(lon1)
  lon2 = Deg2Rad(lon2)
  const R = 6371; // km
  const x = (lon2 - lon1) * Math.cos((lat1 + lat2) / 2)
  const y = (lat2 - lat1)
  const d = 1000 * Math.sqrt(x * x + y * y) * R   // in meters.
  return d
}

async function NearestStop(latitude, longitude) {
  let minDif = 99999
  let closest
  for (let index = 1; index <= 10; index++) {
    const filename = `emt_${index}.json`
    let emtStops = await getStops(filename)
    emtStops.forEach(emtStop => {
      if (emtStop.suprimida != 0) {
          console.log("Parada suprimida: " + emtStop.denominacion)
          next
      }
      const dif = PythagorasEquirectangular(latitude, longitude, emtStop.lat, emtStop.lon);
      if (dif < minDif) {
          emtStop.distancia = Math.floor(dif)
          closest = JSON.parse(JSON.stringify(emtStop))
          minDif = dif
      }
    })
    emtStops = []
  }
  return closest
}

async function fetchAndParseBusData(url) {  
  // Fetch HTML
  let request = new Request(url)
  let htmlString;
  try {
      htmlString = await request.loadString()
  } catch (error) {
      console.log(`Error fetching stop: ${error}`)
      return { error: "Failed to fetch HTML" }
  }

  // Handle no information available
  if (htmlString.includes("No hi ha informació disponible")) {
      return {
          stop: { stopNumber: "", stopName: "" },
          arrivals: [],
          message: "No information available"
      }
  }

  // Extract stop info
  const stopInfoMatch = htmlString.match(/<div[^>]*data-role="content"[^>]*>\s*<div[^>]*>([^<]+)</)
  const stopInfo = stopInfoMatch ? stopInfoMatch[1].trim() : ""
  const stopParts = stopInfo.split(" - ")
  const stopData = {
      stopNumber: stopParts[0] || "",
      stopName: stopParts.slice(1).join(" - ").trim() || ""
  }

  // Extract bus arrivals
  let busData = []
  const busEntryRegex = /<div[^>]*>\s*<span[^>]*><img[^>]*title="(\d+)"[^>]*>\s*<\/span>\s*<span[^>]*>\s*([^<]+)</g
  let match
  while ((match = busEntryRegex.exec(htmlString)) !== null) {
    // Remove non-breaking spaces and trim immediately
    let text
    text = match[2].replace(/\u00A0/g, "").trim()
    text = match[2].replace(/&nbsp;/g, "").trim()
    const lastDashIndex = text.lastIndexOf(" - ")
    let destination = ""
    let time = ""
    if (lastDashIndex !== -1) {
        destination = text.substring(0, lastDashIndex).trim() // Trim again to ensure no spaces
        time = text.substring(lastDashIndex + 3).trim()
        time = time.replace(/\.+$/, "");
    }
    if (time) {
      busData.push({
        busLine: match[1],
        destination: destination,
        time: time
      })
    }
  }
  return {
    stop: stopData,
    arrivals: busData
  }
}

async function createWidget(busArrivals) {
  // Create widget
  const widget = new ListWidget()
  // widget.url = emtStops.proximas_llegadas
	let nextRefresh = Date.now() + 1000*60 // add 60 second to now
	widget.refreshAfterDate = new Date(nextRefresh)
  widget.backgroundColor = new Color("#242424")
  widget.setPadding(5, 5, 5, 5) // Add padding to prevent clipping

  // Add stop info
  const stopText = busArrivals.stop.stopNumber ? `${busArrivals.stop.stopNumber} - ${busArrivals.stop.stopName}` : "Unknown Stop"
  const stopLabel = widget.addText(stopText)
  stopLabel.textColor = new Color("#444444")
  stopLabel.font = Font.systemFont(14)
  stopLabel.lineLimit = 2
  widget.addSpacer(8)

  // Add up to 3 arrivals
  if (busArrivals.error) {
      const errorLabel = widget.addText("Error fetching data")
      errorLabel.textColor = new Color("#BB9898")
      errorLabel.font = Font.systemFont(14)
  } else if (busArrivals.message) {
      const noInfoLabel = widget.addText("No arrivals available")
      noInfoLabel.textColor = new Color("#BB9898")
      noInfoLabel.font = Font.systemFont(14)
  } else {
      const arrivals = busArrivals.arrivals.slice(0, 3)
      for (const arrival of arrivals) {
          const rowStack = widget.addStack()
          rowStack.layoutHorizontally()
          rowStack.centerAlignContent()
          
          // Red square with bus line number
          const lineStack = rowStack.addStack()
          lineStack.size = new Size(28, 28)
          lineStack.backgroundColor = new Color("#DD0000")
          lineStack.cornerRadius = 4
          lineStack.centerAlignContent()
          const lineText = lineStack.addText(arrival.busLine)
          lineText.textColor = new Color("#DDDDDD")
          lineText.font = Font.heavySystemFont(15)
          
          // Destination text (aligned left, to the right of red square)
          rowStack.addSpacer(8) // Small gap after red square
          const destText = rowStack.addText(arrival.destination)
          destText.textColor = new Color("#989898")
          destText.font = Font.systemFont(14)
          destText.lineLimit = 1
          
          // Spacer to push time to the right
          rowStack.addSpacer()
          
          // Arrival time (aligned right)
          const timeText = rowStack.addText(arrival.time)
          timeText.textColor = new Color("#989898")
          timeText.font = Font.systemFont(14)
          rowStack.addSpacer(4)
          widget.addSpacer(4)
      }
  }

  return widget
}


let emtStops
let closestStop
let url
let busArrivals
let widget

if (TESTMODE == false) {
  currentLocation = await getCurrentLocation() || currentLocation
}
closestStop = await NearestStop(currentLocation.latitude, currentLocation.longitude)
url = closestStop.proximas_llegadas
busArrivals = await fetchAndParseBusData(url)
widget = await createWidget(busArrivals)



if (config.runsInWidget) {
  Script.setWidget(widget)
  // Script.complete()
} else if (args.widgetParameter === 'callback') {
  const timestamp = (new Date().getTime() - new Date('2001/01/01').getTime()) / 1000
  const callback = new CallbackURL(`${WIDGET_CONFIGURATIONS.callbackCalendarApp}:${timestamp}`)
  callback.open()
  // Script.complete()
} else {
  Script.setWidget(widget)
  widget.presentMedium()
  // Script.complete()
}

