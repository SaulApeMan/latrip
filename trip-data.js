/*
 * LA TRIP CONTENT
 * ----------------
 * Edit this file to update all trip content shown on the website.
 *
 * Schedule item format:
 * { time: "Add time", place: "Add activity or place", note: "Add a short note" }
 *
 * Fixed commitments live in a day's fixedBlocks array:
 * {
 *   kind: "travel",
 *   label: "Flight arrival · LAX",
 *   startTime: "20:05",
 *   endTime: "",
 *   note: "Confirmed travel detail",
 *   dayBoundary: "starts-after" // or "ends-before"
 * }
 *
 * Optional To Visit map fields:
 * coordinates: { lat: 34.0000, lng: -118.0000 }
 * mapLabel: "Short marker label"
 *
 * Map-only pins stay separate from To Visit. They may optionally use
 * categoryKey, note, and officialUrl. Use generalized coordinates for
 * privacy-sensitive locations and keep their labels deliberately non-specific.
 *
 * To Visit detail fields:
 * id: "stable-place-id"
 * category: "Place category"
 * categoryKey: "food | shop | animals | sightseeing | science"
 * icon: "F | S | A | L | M"
 * officialUrl: "https://..."
 * googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=..."
 * extraLinks: [{ label: "Useful resource", url: "https://..." }]
 * estimatedTicket: "$0 · general admission"
 * estimatedParking: "Paid / confirm"
 *
 * Keep placeholder: true until a row has real trip information. This makes
 * unfinished content visually clear on the website.
 */

window.TRIP_DATA = {
  meta: {
    eyebrow: "Los Angeles",
    title: "BlizzCon 2026",
    intro: "",
    dates: "September 10–18",
    timezone: "Los Angeles local time",
    status: "Awaiting Saul’s plan",
    footerNote: "A working field guide for the LA trip · Content is intentionally unfinished"
  },

  days: [
    {
      label: "Day 1",
      date: "Thursday, September 10",
      title: "Day 1",
      summary: "The day begins with the confirmed LAX arrival; plans belong after 8:05 PM.",
      fixedBlocks: [
        {
          kind: "travel",
          label: "Flight arrival · LAX",
          startTime: "20:05",
          endTime: "",
          note: "Nonstop from Warsaw (WAW); departs 4:45 PM Warsaw time; flight duration 12h 20m.",
          dayBoundary: "starts-after"
        }
      ],
      items: [
        {
          time: "Add time",
          place: "Add activity or place",
          note: "Add a short note, reservation detail, or travel cue.",
          placeholder: true
        }
      ]
    },
    {
      label: "Day 2",
      date: "Friday, September 11",
      title: "Day 2",
      summary: "The schedule is ready for Saul’s plans.",
      fixedBlocks: [],
      items: [
        {
          time: "Add time",
          place: "Add activity or place",
          note: "Add a short note, reservation detail, or travel cue.",
          placeholder: true
        }
      ]
    },
    {
      label: "Day 3",
      date: "Saturday, September 12",
      title: "Day 3",
      summary: "The schedule is ready for Saul’s plans.",
      fixedBlocks: [],
      items: [
        {
          time: "Add time",
          place: "Add activity or place",
          note: "Add a short note, reservation detail, or travel cue.",
          placeholder: true
        }
      ]
    },
    {
      label: "Day 4",
      date: "Sunday, September 13",
      title: "Day 4",
      summary: "The schedule is ready for Saul’s plans.",
      fixedBlocks: [],
      items: [
        {
          time: "Add time",
          place: "Add activity or place",
          note: "Add a short note, reservation detail, or travel cue.",
          placeholder: true
        }
      ]
    },
    {
      label: "Day 5",
      date: "Monday, September 14",
      title: "Day 5",
      summary: "The schedule is ready for Saul’s plans.",
      fixedBlocks: [],
      items: [
        {
          time: "Add time",
          place: "Add activity or place",
          note: "Add a short note, reservation detail, or travel cue.",
          placeholder: true
        }
      ]
    },
    {
      label: "Day 6",
      date: "Tuesday, September 15",
      title: "Day 6",
      summary: "The schedule is ready for Saul’s plans.",
      fixedBlocks: [],
      items: [
        {
          time: "Add time",
          place: "Add activity or place",
          note: "Add a short note, reservation detail, or travel cue.",
          placeholder: true
        }
      ]
    },
    {
      label: "Day 7",
      date: "Wednesday, September 16",
      title: "Day 7",
      summary: "The schedule is ready for Saul’s plans.",
      fixedBlocks: [],
      items: [
        {
          time: "Add time",
          place: "Add activity or place",
          note: "Add a short note, reservation detail, or travel cue.",
          placeholder: true
        }
      ]
    },
    {
      label: "Day 8",
      date: "Thursday, September 17",
      title: "Day 8",
      summary: "The day is open for Saul’s plans before the departure block.",
      fixedBlocks: [
        {
          kind: "travel",
          label: "Flight departure · LAX",
          startTime: "22:05",
          endTime: "",
          note: "Nonstop to Warsaw (WAW); arrives Friday, September 18 at 6:40 PM Warsaw time; flight duration 11h 35m.",
          dayBoundary: "ends-before"
        }
      ],
      items: []
    }
  ],

  toVisit: [
    {
      id: "griffith-observatory",
      place: "Griffith Observatory",
      note: "On Mount Hollywood in Griffith Park, with views of Los Angeles and the Hollywood Sign.",
      category: "Sightseeing / observatory",
      categoryKey: "sightseeing",
      icon: "L",
      officialUrl: "https://griffithobservatory.org/",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Griffith+Observatory",
      estimatedTicket: "$0 · general admission",
      estimatedParking: "Paid / confirm",
      coordinates: { lat: 34.1184, lng: -118.3004 },
      mapLabel: "Griffith Observatory",
      placeholder: false
    },
    {
      id: "seaworld-san-diego",
      place: "SeaWorld San Diego",
      note: "Confirmed San Diego day-trip destination; outside Los Angeles neighborhoods and not yet assigned to a day.",
      category: "Animals",
      categoryKey: "animals",
      icon: "A",
      officialUrl: "https://seaworld.com/san-diego/",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=SeaWorld+San+Diego",
      estimatedTicket: "$100 · dynamic pricing",
      estimatedParking: "$35",
      coordinates: { lat: 32.7644, lng: -117.2266 },
      mapLabel: "SeaWorld San Diego",
      placeholder: false
    },
    {
      id: "anaheim-convention-center",
      place: "Anaheim Convention Center",
      note: "BlizzCon venue.",
      category: "Sightseeing / venue",
      categoryKey: "sightseeing",
      icon: "L",
      officialUrl: "https://www.anaheim.net/1117/Anaheim-Convention-Center",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Anaheim+Convention+Center",
      estimatedTicket: "$250 · Saul-provided",
      estimatedParking: "Confirm",
      coordinates: { lat: 33.8003, lng: -117.9190 },
      mapLabel: "Anaheim Convention Center",
      placeholder: false
    },
    {
      id: "california-science-center",
      place: "California Science Center",
      note: "Science museum in Exposition Park; Space Shuttle Endeavour.",
      category: "Science / museum",
      categoryKey: "science",
      icon: "M",
      officialUrl: "https://californiasciencecenter.org/",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=California+Science+Center",
      estimatedTicket: "$0 · general admission",
      estimatedParking: "$20",
      coordinates: { lat: 34.0159, lng: -118.2862 },
      mapLabel: "California Science Center",
      placeholder: false
    },
    {
      id: "aquarium-of-the-pacific",
      place: "Aquarium of the Pacific",
      note: "Pacific aquarium on Rainbow Harbor, Long Beach.",
      category: "Animals",
      categoryKey: "animals",
      icon: "A",
      officialUrl: "https://www.aquariumofpacific.org/",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Aquarium+of+the+Pacific",
      estimatedTicket: "$49.95",
      estimatedParking: "$8",
      coordinates: { lat: 33.7626, lng: -118.1980 },
      mapLabel: "Aquarium of the Pacific",
      placeholder: false
    },
    {
      id: "erewhon-beverly-hills",
      place: "Erewhon Beverly Hills",
      note: "Confirmed grocery and shopping candidate in Beverly Hills.",
      category: "Shop",
      categoryKey: "shop",
      icon: "S",
      officialUrl: "https://erewhon.com/locations",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Erewhon+Beverly+Hills+339+N+Beverly+Dr+Beverly+Hills+CA",
      estimatedTicket: "",
      estimatedParking: "",
      coordinates: { lat: 34.0710, lng: -118.4007 },
      mapLabel: "Erewhon Beverly Hills",
      placeholder: false
    },
    {
      id: "erewhon-west-hollywood",
      place: "Erewhon West Hollywood",
      note: "Confirmed grocery and shopping candidate in West Hollywood.",
      category: "Shop",
      categoryKey: "shop",
      icon: "S",
      officialUrl: "https://erewhon.com/locations",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Erewhon+West+Hollywood+8550+Santa+Monica+Blvd+West+Hollywood+CA",
      estimatedTicket: "",
      estimatedParking: "",
      coordinates: { lat: 34.0903, lng: -118.3778 },
      mapLabel: "Erewhon West Hollywood",
      placeholder: false
    },
    {
      id: "crazee-burger",
      place: "Crazee Burger",
      note: "Exotic-burger restaurant in North Park; strong candidate for a San Diego day.",
      category: "Food / restaurant",
      categoryKey: "food",
      icon: "F",
      officialUrl: "https://crazeeburger.com/",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Crazee+Burger+3993+30th+Street+San+Diego+CA+92104",
      estimatedTicket: "",
      estimatedParking: "",
      coordinates: { lat: 32.7501, lng: -117.1300 },
      mapLabel: "Crazee Burger",
      placeholder: false
    },
    {
      id: "wurstkuche",
      place: "Wurstküche",
      note: "Exotic sausages and fries in the DTLA Arts District.",
      category: "Food / restaurant",
      categoryKey: "food",
      icon: "F",
      officialUrl: "https://www.wurstkuche.com/locations",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Wurstkuche+800+E+3rd+St+Los+Angeles+CA+90013",
      estimatedTicket: "",
      estimatedParking: "",
      coordinates: { lat: 34.0455, lng: -118.2360 },
      mapLabel: "Wurstküche",
      placeholder: false
    },
    {
      id: "target-la-central",
      place: "Target LA Central",
      note: "DTLA supplies stop that pairs well with the existing Wurstküche area.",
      category: "Shop",
      categoryKey: "shop",
      icon: "S",
      officialUrl: "https://www.target.com/sl/LA-Central-Store/2776",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Target+LA+Central+735+S+Figueroa+St+Los+Angeles+CA+90017",
      estimatedTicket: "",
      estimatedParking: "",
      coordinates: { lat: 34.0488, lng: -118.2608 },
      mapLabel: "Target LA Central",
      placeholder: false
    },
    {
      id: "target-long-beach-bellflower",
      place: "Target Long Beach Bellflower",
      note: "Useful supplies stop for an Aquarium of the Pacific / Long Beach day; requires a short drive.",
      category: "Shop",
      categoryKey: "shop",
      icon: "S",
      officialUrl: "https://www.target.com/sl/long-beach-bellflower/195",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Target+2270+N+Bellflower+Blvd+Long+Beach+CA+90815",
      estimatedTicket: "",
      estimatedParking: "",
      coordinates: { lat: 33.7973, lng: -118.1251 },
      mapLabel: "Target Long Beach Bellflower",
      placeholder: false
    },
    {
      id: "venice-beach",
      place: "Venice Beach",
      note: "Beach, boardwalk, and street life; no day assignment yet.",
      category: "Landmark / sightseeing",
      categoryKey: "sightseeing",
      icon: "L",
      officialUrl: "https://www.discoverlosangeles.com/things-to-do/venice-beach",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Venice+Beach+Boardwalk+Los+Angeles+CA",
      estimatedTicket: "",
      estimatedParking: "",
      coordinates: { lat: 33.9832, lng: -118.4700 },
      mapLabel: "Venice Beach",
      placeholder: false
    },
    {
      id: "tesla-diner",
      place: "Tesla Diner",
      note: "Hollywood retro-futuristic diner, drive-in experience, and Supercharging location.",
      category: "Food / experience",
      categoryKey: "food",
      icon: "F",
      officialUrl: "https://www.tesla.com/tesla-diner",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Tesla+Diner+7001+Santa+Monica+Blvd+Los+Angeles+CA+90038",
      estimatedTicket: "",
      estimatedParking: "",
      coordinates: { lat: 34.0908, lng: -118.3418 },
      mapLabel: "Tesla Diner",
      placeholder: false
    },
    {
      id: "in-n-out-la-mirada",
      place: "In-N-Out Burger · La Mirada",
      note: "La Mirada burger stop with drive-thru and dine-in seating.",
      category: "Food / restaurant",
      categoryKey: "food",
      icon: "F",
      officialUrl: "https://locations.in-n-out.com/105",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=In-N-Out+Burger+14341+Firestone+Blvd+La+Mirada+CA+90638",
      estimatedTicket: "",
      estimatedParking: "",
      coordinates: { lat: 33.8843, lng: -118.0260 },
      mapLabel: "In-N-Out · La Mirada",
      placeholder: false
    },
    {
      id: "walmart-la-habra-imperial",
      place: "La Habra E Imperial Hwy Supercenter",
      note: "Large all-purpose grocery and big-box store.",
      category: "Shop",
      categoryKey: "shop",
      icon: "S",
      officialUrl: "https://www.walmart.com/store-directory/ca/la%20habra",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Walmart+Supercenter+1000+E+Imperial+Hwy+La+Habra+CA+90631",
      estimatedTicket: "",
      estimatedParking: "",
      coordinates: { lat: 33.91726, lng: -117.93557 },
      mapLabel: "La Habra E Imperial Hwy Supercenter",
      placeholder: false
    },
    {
      id: "walmart-la-habra-westridge",
      place: "La Habra Westridge Shopping Plaza Supercenter",
      note: "Large all-purpose grocery and big-box store.",
      category: "Shop",
      categoryKey: "shop",
      icon: "S",
      officialUrl: "https://www.walmart.com/store/3248-la-habra-ca",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Walmart+Supercenter+1340+S+Beach+Blvd+La+Habra+CA+90631",
      estimatedTicket: "",
      estimatedParking: "",
      coordinates: { lat: 33.91637, lng: -117.96658 },
      mapLabel: "La Habra Westridge Shopping Plaza Supercenter",
      placeholder: false
    },
    {
      id: "blizzard-entertainment-headquarters-irvine",
      place: "Blizzard Entertainment Headquarters — Irvine",
      note: "Corporate office and trip reference point; this listing does not imply public tours or visitor access.",
      category: "Landmark / venue",
      categoryKey: "sightseeing",
      icon: "L",
      officialUrl: "https://careers.blizzard.com/global/en/irvine/1000",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Blizzard+Entertainment+One+Blizzard+Way+Irvine+CA+92618",
      estimatedTicket: "",
      estimatedParking: "",
      coordinates: { lat: 33.65815, lng: -117.76722 },
      mapLabel: "Blizzard Entertainment Headquarters — Irvine",
      placeholder: false
    },
    {
      id: "vandenberg-falcon-9-launch-site",
      place: "Vandenberg Space Force Base — Falcon 9 launch site",
      note: "Secure military-base reference; public access is restricted and this is not a confirmed visit. Falcon 9 launches use SLC-4E, and timing can change or scrub. West Ocean Avenue near Lompoc is a practical public viewing area (visibility, weather, and closures vary); Surf Beach is another option only when open.",
      category: "Landmark / venue",
      categoryKey: "sightseeing",
      icon: "L",
      officialUrl: "https://www.vandenberg.spaceforce.mil/News/Article-Display/Article/4399862/vandenberg-space-force-bases-seventh-launch-of-2026/",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Vandenberg+Space+Force+Base+SLC-4E+California",
      extraLinks: [
        {
          label: "Live launch schedule",
          url: "https://spaceflightnow.com/launch-schedule/"
        },
        {
          label: "Lompoc viewing guide",
          url: "https://lompoc.com/visit-lompoc/lompoc-rocket-launches/"
        }
      ],
      estimatedTicket: "",
      estimatedParking: "",
      coordinates: { lat: 34.6320, lng: -120.6107 },
      mapLabel: "Vandenberg Space Force Base — Falcon 9 launch site",
      placeholder: false
    }
  ],

  mapOnlyPins: [
    {
      id: "generalized-hotel",
      label: "Hotel",
      categoryKey: "hotel",
      coordinates: { lat: 33.9205, lng: -118.0035 }
    }
  ],

  checklist: [
    { task: "Add a planning task", done: false, placeholder: true }
  ]
};
