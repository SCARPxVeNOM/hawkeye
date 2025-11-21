/**
 * Location Validation Utility
 * Validates GPS coordinates and location data
 */

export interface LocationValidationResult {
  valid: boolean
  error?: string
  normalized?: {
    latitude: number
    longitude: number
  }
}

/**
 * Validate GPS coordinates
 */
export function validateGPSCoordinates(
  latitude: string | number | null | undefined,
  longitude: string | number | null | undefined
): LocationValidationResult {
  if (!latitude || !longitude) {
    return {
      valid: false,
      error: "GPS coordinates are required",
    }
  }

  const lat = typeof latitude === "string" ? parseFloat(latitude) : latitude
  const lng = typeof longitude === "string" ? parseFloat(longitude) : longitude

  if (isNaN(lat) || isNaN(lng)) {
    return {
      valid: false,
      error: "Invalid GPS coordinate format",
    }
  }

  // Validate latitude range (-90 to 90)
  if (lat < -90 || lat > 90) {
    return {
      valid: false,
      error: "Latitude must be between -90 and 90 degrees",
    }
  }

  // Validate longitude range (-180 to 180)
  if (lng < -180 || lng > 180) {
    return {
      valid: false,
      error: "Longitude must be between -180 and 180 degrees",
    }
  }

  return {
    valid: true,
    normalized: {
      latitude: lat,
      longitude: lng,
    },
  }
}

/**
 * Validate location string
 */
export function validateLocationString(location: string): LocationValidationResult {
  if (!location || location.trim().length === 0) {
    return {
      valid: false,
      error: "Location is required",
    }
  }

  if (location.length < 3) {
    return {
      valid: false,
      error: "Location must be at least 3 characters",
    }
  }

  if (location.length > 255) {
    return {
      valid: false,
      error: "Location must be less than 255 characters",
    }
  }

  return {
    valid: true,
  }
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

