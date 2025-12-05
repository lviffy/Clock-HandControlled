import { NextResponse, type NextRequest } from "next/server";

function conditionFromCode(code: number) {
  const map: Record<number, string> = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Cloudy",
    45: "Fog",
    48: "Fog",
    51: "Drizzle",
    61: "Rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Snow",
    80: "Showers",
    95: "Thunderstorm",
  };
  return map[code] ?? "Atmospheric";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Missing lat/lon parameters" },
      { status: 400 }
    );
  }

  const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code`;

  try {
    const [weatherRes, geoRes] = await Promise.all([
      fetch(endpoint, { cache: "no-store" }),
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            "User-Agent": "CoolClock/1.0 (coolclock@example.com)", // Required by Nominatim
          },
          cache: "force-cache",
        }
      ),
    ]);

    if (!weatherRes.ok) {
      return NextResponse.json(
        { error: "Weather provider error" },
        { status: 502 }
      );
    }

    const weatherJson = await weatherRes.json();
    let locationName = "Unknown Sector";

    if (geoRes.ok) {
      const geoJson = await geoRes.json();
      const addr = geoJson.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.county ||
        addr.state_district;
      const country = addr.country_code?.toUpperCase();

      if (city && country) {
        locationName = `${city}, ${country}`;
      } else if (city) {
        locationName = city;
      } else if (geoJson.display_name) {
        // Fallback to first part of display name if structured address fails
        locationName = geoJson.display_name.split(",")[0];
      }
    }

    const current = weatherJson.current ?? {};

    const payload = {
      temp: current.temperature_2m ?? 0,
      feelsLike: current.apparent_temperature ?? current.temperature_2m ?? 0,
      humidity: current.relative_humidity_2m ?? 0,
      windSpeed: current.wind_speed_10m ?? 0,
      windDirection: current.wind_direction_10m ?? 0,
      condition: conditionFromCode(current.weather_code ?? -1),
      conditionCode: current.weather_code ?? -1,
      location: { lat: Number(lat), lon: Number(lon) },
      locationName,
    };
    return NextResponse.json(payload);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
  }
}

