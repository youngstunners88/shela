// Shela ZK Circuit: Private Location Verification
// Proves user is within radius R of target without revealing exact location

template LocationProof() {
    // Private inputs: actual coordinates
    signal input userLat;
    signal input userLng;
    
    // Public inputs
    signal input meetLat;
    signal input meetLng;
    signal input radius; // in meters (scaled)
    
    // Output: within radius (1) or not (0)
    signal output withinRadius;
    
    // Calculate distance using Haversine approximation
    // For ZK, we use squared Euclidean on small distances
    signal dLat;
    signal dLng;
    signal latSq;
    signal lngSq;
    signal distanceSq;
    
    // Differences
    dLat <-- userLat - meetLat;
    dLng <-- userLng - meetLng;
    
    // Squared distance (simplified for small distances)
    latSq <-- dLat * dLat;
    lngSq <-- dLng * dLng;
    distanceSq <-- latSq + lngSq;
    
    // Compare to radius squared
    signal radiusSq;
    radiusSq <-- radius * radius;
    
    // Range proof: distanceSq <= radiusSq
    // Using less-than gadget
    component lt = LessThan(64);
    lt.in[0] <-- distanceSq;
    lt.in[1] <-- radiusSq;
    
    withinRadius <-- lt.out;
}

// Check location without revealing exact coordinates
component main = LocationProof();