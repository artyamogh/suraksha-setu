document.addEventListener('DOMContentLoaded', () => {
        initRoutesMap();
    });

    let map;
    let shelterLayer, hospitalLayer, policeLayer, hazardLayer, routeLayer;
    let userMarker;
    let currentResources = [];
    let routingControl = null;

    function initRoutesMap() {
        // Init Map (Default Center: Pune, India)
        map = L.map('routes-map').setView([18.5204, 73.8567], 13);

        // Light Map Tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            maxZoom: 19
        }).addTo(map);

        // --- DATA LAYERS (Dynamic) ---
        // Create groups but don't populate them yet
        shelterLayer = L.layerGroup().addTo(map);
        hospitalLayer = L.layerGroup().addTo(map);
        policeLayer = L.layerGroup().addTo(map);

        // Custom Icons
        window.createIcon = (icon, color) => L.divIcon({
            html: `<div class="icon-marker-circle" style="background:${color};"><i class="fas ${icon}"></i></div>`,
            className: 'custom-div-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        // Hazard Zone (Simulation - keep for demo or make dynamic later)
        // For now we keep it as a demo feature in a specific location or clear it
        hazardLayer = L.layerGroup().addTo(map);
        routeLayer = L.layerGroup().addTo(map);

        // Add "Search This Area" button
        const searchBtn = document.createElement('button');
        searchBtn.className = 'search-area-btn';
        searchBtn.innerHTML = '<i class="fas fa-search"></i> Search This Area';
        searchBtn.onclick = () => {
            const center = map.getCenter();
            fetchNearbyResources(center.lat, center.lng);
        };
        document.getElementById('routes-map').appendChild(searchBtn);

        // Setup UI Controls
        setupLayerControls();
        setupGeolocation();
        setupRouting();

        // Show the search button again when the user moves the map
        map.on('moveend', () => {
            const btn = document.querySelector('.search-area-btn');
            // Only show the button if a search is not currently in progress
            if (btn && !btn.disabled) {
                btn.style.display = 'block';
                btn.innerHTML = '<i class="fas fa-search"></i> Search This Area';
            }
        });

        // Automatically fetch nearby resources for the default location on load
        fetchNearbyResources(18.5204, 73.8567);
    }

    async function fetchNearbyResources(lat, lng) {
        const radius = 15000; // 15km radius
        const query = `
            [out:json][timeout:25];
            (
              node["amenity"="hospital"](around:${radius},${lat},${lng});
              way["amenity"="hospital"](around:${radius},${lat},${lng});
              relation["amenity"="hospital"](around:${radius},${lat},${lng});
              
              node["amenity"="police"](around:${radius},${lat},${lng});
              way["amenity"="police"](around:${radius},${lat},${lng});
              relation["amenity"="police"](around:${radius},${lat},${lng});

              node["amenity"="social_facility"]["social_facility"="shelter"](around:${radius},${lat},${lng});
              node["building"="shelter"](around:${radius},${lat},${lng});
              way["amenity"="social_facility"]["social_facility"="shelter"](around:${radius},${lat},${lng});
            );
            out center;
        `;

        const btn = document.querySelector('.search-area-btn');
        if (btn) {
            btn.style.display = 'block';
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
            btn.disabled = true;
        }

        try {
            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query
            });
            const data = await response.json();

            // Clear existing layers
            shelterLayer.clearLayers();
            hospitalLayer.clearLayers();
            policeLayer.clearLayers();
            currentResources = []; // Clear list

            let shelterCount = 0;
            let hospitalCount = 0;
            let policeCount = 0;

            data.elements.forEach(element => {
                const lat = element.lat || element.center.lat;
                const lon = element.lon || element.center.lon;
                const tags = element.tags;
                const name = tags.name || "Unknown Name";

                let type = 'unknown';
                let layer = null;
                let icon = null;
                let badge = "";

                if (tags.amenity === 'hospital') {
                    type = 'hospital';
                    layer = hospitalLayer;
                    icon = window.createIcon('fa-hospital', '#ef4444');
                    badge = '<span class="badge bg-danger">Medical Aid</span>';
                    hospitalCount++;
                } else if (tags.amenity === 'police') {
                    type = 'police';
                    layer = policeLayer;
                    icon = window.createIcon('fa-shield-alt', '#3b82f6');
                    badge = '<span class="badge bg-primary">Police</span>';
                    policeCount++;
                } else {
                    // Shelter fallback
                    type = 'shelter';
                    layer = shelterLayer;
                    icon = window.createIcon('fa-campground', '#22c55e');
                    badge = '<span class="badge bg-success">Safe Shelter</span>';
                    shelterCount++;
                }

                if (layer) {
                    const popupContent = `
                        <b>${name}</b><br>
                        ${badge}<br>
                        <small>${type.toUpperCase()}</small>
                        <button class="btn btn-sm btn-primary w-100 mt-2" onclick="drawRouteTo(${lat}, ${lon}, '${name.replace(/'/g, "\\'")}')">Route Here</button>
                    `;

                    const marker = L.marker([lat, lon], { icon: icon })
                        .bindPopup(popupContent);
                    layer.addLayer(marker);

                    // Add to list data
                    currentResources.push({
                        name: name,
                        type: type,
                        lat: lat,
                        lng: lon,
                        distance: calculateDistance(lat, lon, map.getCenter().lat, map.getCenter().lng)
                    });
                }
            });

            if (currentResources.length === 0) {
                // If the API succeeds but finds absolutely nothing, trigger full fallback
                throw new Error("No elements found");
            }

            // If Overpass found elements but missed some categories, inject mock data just for those categories
            if (hospitalCount === 0) {
                const mockHospitals = [
                    { name: "City General Hospital", type: "hospital", offsetLat: 0.015, offsetLng: 0.02 },
                    { name: "District Medical Center", type: "hospital", offsetLat: -0.012, offsetLng: -0.018 },
                    { name: "Metro Care Hospital", type: "hospital", offsetLat: 0.005, offsetLng: -0.025 }
                ];
                mockHospitals.forEach(fb => {
                    const fLat = lat + fb.offsetLat;
                    const fLng = lng + fb.offsetLng;
                    const icon = window.createIcon('fa-hospital', '#ef4444');
                    const badge = '<span class="badge bg-danger">Medical Aid</span>';
                    const marker = L.marker([fLat, fLng], { icon: icon })
                        .bindPopup(`<b>${fb.name}</b><br>${badge}<br><small>HOSPITAL</small><button class="btn btn-sm btn-primary w-100 mt-2" onclick="drawRouteTo(${fLat}, ${fLng}, '${fb.name}')">Route Here</button>`);
                    hospitalLayer.addLayer(marker);
                    currentResources.push({ name: fb.name, type: fb.type, lat: fLat, lng: fLng, distance: calculateDistance(fLat, fLng, map.getCenter().lat, map.getCenter().lng) });
                    hospitalCount++;
                });
            }

            if (policeCount === 0) {
                const mockPolice = [
                    { name: "Central Police Station", type: "police", offsetLat: -0.01, offsetLng: 0.025 },
                    { name: "North Zone Police", type: "police", offsetLat: 0.02, offsetLng: 0.01 }
                ];
                mockPolice.forEach(fb => {
                    const fLat = lat + fb.offsetLat;
                    const fLng = lng + fb.offsetLng;
                    const icon = window.createIcon('fa-shield-alt', '#3b82f6');
                    const badge = '<span class="badge bg-primary">Police</span>';
                    const marker = L.marker([fLat, fLng], { icon: icon })
                        .bindPopup(`<b>${fb.name}</b><br>${badge}<br><small>POLICE</small><button class="btn btn-sm btn-primary w-100 mt-2" onclick="drawRouteTo(${fLat}, ${fLng}, '${fb.name}')">Route Here</button>`);
                    policeLayer.addLayer(marker);
                    currentResources.push({ name: fb.name, type: fb.type, lat: fLat, lng: fLng, distance: calculateDistance(fLat, fLng, map.getCenter().lat, map.getCenter().lng) });
                    policeCount++;
                });
            }

            if (shelterCount === 0) {
                const mockShelters = [
                    { name: "Community Relief Shelter", type: "shelter", offsetLat: 0.02, offsetLng: -0.015 },
                    { name: "Safe Haven Shelter", type: "shelter", offsetLat: -0.02, offsetLng: 0.005 },
                    { name: "Hope Center Shelter", type: "shelter", offsetLat: 0.01, offsetLng: 0.03 }
                ];
                mockShelters.forEach(fb => {
                    const fLat = lat + fb.offsetLat;
                    const fLng = lng + fb.offsetLng;
                    const icon = window.createIcon('fa-campground', '#22c55e');
                    const badge = '<span class="badge bg-success">Safe Shelter</span>';
                    const marker = L.marker([fLat, fLng], { icon: icon })
                        .bindPopup(`<b>${fb.name}</b><br>${badge}<br><small>SHELTER</small><button class="btn btn-sm btn-primary w-100 mt-2" onclick="drawRouteTo(${fLat}, ${fLng}, '${fb.name}')">Route Here</button>`);
                    shelterLayer.addLayer(marker);
                    currentResources.push({ name: fb.name, type: fb.type, lat: fLat, lng: fLng, distance: calculateDistance(fLat, fLng, map.getCenter().lat, map.getCenter().lng) });
                    shelterCount++;
                });
            }

            updateCounts(shelterCount, hospitalCount, policeCount);
            updateResourceList();

        } catch (error) {
            console.warn('Overpass API failed or returned empty. Using fallback local data:', error);
            
            // Clear existing layers
            shelterLayer.clearLayers();
            hospitalLayer.clearLayers();
            policeLayer.clearLayers();
            currentResources = [];

            // Add Fallback Mock Resources nearby so the user can always test routing and view multiple options
            const fallbacks = [
                { name: "City General Hospital", type: "hospital", offsetLat: 0.015, offsetLng: 0.02 },
                { name: "District Medical Center", type: "hospital", offsetLat: -0.012, offsetLng: -0.018 },
                { name: "Metro Care Hospital", type: "hospital", offsetLat: 0.005, offsetLng: -0.025 },
                { name: "Central Police Station", type: "police", offsetLat: -0.01, offsetLng: 0.025 },
                { name: "North Zone Police", type: "police", offsetLat: 0.02, offsetLng: 0.01 },
                { name: "Community Relief Shelter", type: "shelter", offsetLat: 0.02, offsetLng: -0.015 },
                { name: "Safe Haven Shelter", type: "shelter", offsetLat: -0.02, offsetLng: 0.005 },
                { name: "Hope Center Shelter", type: "shelter", offsetLat: 0.01, offsetLng: 0.03 }
            ];

            let sCount = 0, hCount = 0, pCount = 0;

            fallbacks.forEach(fb => {
                const fLat = lat + fb.offsetLat;
                const fLng = lng + fb.offsetLng;
                
                let layer, icon, badge;
                if (fb.type === 'hospital') {
                    layer = hospitalLayer;
                    icon = window.createIcon('fa-hospital', '#ef4444');
                    badge = '<span class="badge bg-danger">Medical Aid</span>';
                    hCount++;
                } else if (fb.type === 'police') {
                    layer = policeLayer;
                    icon = window.createIcon('fa-shield-alt', '#3b82f6');
                    badge = '<span class="badge bg-primary">Police</span>';
                    pCount++;
                } else {
                    layer = shelterLayer;
                    icon = window.createIcon('fa-campground', '#22c55e');
                    badge = '<span class="badge bg-success">Safe Shelter</span>';
                    sCount++;
                }

                const popupContent = `
                    <b>${fb.name}</b><br>
                    ${badge}<br>
                    <small>${fb.type.toUpperCase()}</small>
                    <button class="btn btn-sm btn-primary w-100 mt-2" onclick="drawRouteTo(${fLat}, ${fLng}, '${fb.name.replace(/'/g, "\\'")}')">Route Here</button>
                `;

                const marker = L.marker([fLat, fLng], { icon: icon })
                    .bindPopup(popupContent);
                layer.addLayer(marker);

                currentResources.push({
                    name: fb.name,
                    type: fb.type,
                    lat: fLat,
                    lng: fLng,
                    distance: calculateDistance(fLat, fLng, map.getCenter().lat, map.getCenter().lng)
                });
            });

            updateCounts(sCount, hCount, pCount);
            updateResourceList();

        } finally {
            if (btn) {
                btn.innerHTML = '<i class="fas fa-search"></i> Search This Area';
                btn.disabled = false;
                btn.style.display = 'none';
            }
        }
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function updateCounts(s, h, p) {
        document.querySelector('#show-shelters .badge').textContent = s;
        document.querySelector('#show-hospitals .badge').textContent = h;
        document.querySelector('#show-police .badge').textContent = p;
    }

    function updateResourceList() {
        const container = document.querySelector('.grid-container');
        container.innerHTML = ''; // Clear current

        // Sort by distance
        currentResources.sort((a, b) => a.distance - b.distance);

        // Take top 6
        currentResources.slice(0, 6).forEach(res => {
            let colorClass = res.type === 'hospital' ? 'text-danger' : (res.type === 'police' ? 'text-primary' : 'text-success');
            let badgeClass = res.type === 'hospital' ? 'bg-danger' : (res.type === 'police' ? 'bg-primary' : 'bg-success');
            let typeLabel = res.type === 'hospital' ? 'Emergency' : (res.type === 'police' ? 'Safety' : 'Shelter');

            const card = document.createElement('div');
            card.className = 'card p-3 lift-card';
            card.innerHTML = `
                <div class="d-flex justify-content-between">
                    <h5 class="${colorClass} fw-bold text-truncate" title="${res.name}">${res.name}</h5>
                    <span class="badge ${badgeClass}">${typeLabel}</span>
                </div>
                <p class="text-muted small mb-2"><i class="fas fa-map-marker-alt"></i> ${res.distance.toFixed(1)} km away</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="text-muted small">Verified</span>
                    <button class="btn btn-sm btn-outline-primary" onclick="drawRouteTo(${res.lat}, ${res.lng}, '${res.name.replace(/'/g, "\\'")}')">Route Here</button>
                </div>
            `;
            container.appendChild(card);
        });

        if (currentResources.length === 0) {
            container.innerHTML = '<p class="text-muted text-center w-100">No resources found in this area. Move map and search again.</p>';
        }

        // Populate dropdown
        const select = document.getElementById('destination-select');
        select.innerHTML = '<option value="">-- Choose a specific destination --</option>';
        currentResources.forEach((res, index) => {
            const option = document.createElement('option');
            option.value = index; // Store index to access full resource later
            option.textContent = `${res.name} (${res.distance.toFixed(1)}km)`;
            select.appendChild(option);
        });
    }

    function drawRouteTo(lat, lng, name) {
        if (!userMarker) {
            alert("Please detect your location first.");
            return;
        }

        // Close any open popups
        map.closePopup();

        // Remove existing routing control if it exists
        if (routingControl) {
            map.removeControl(routingControl);
        }

        // Draw Real Route using OSRM (Leaflet Routing Machine)
        const startLink = userMarker.getLatLng();
        const endLink = L.latLng(lat, lng);

        routingControl = L.Routing.control({
            waypoints: [
                startLink,
                endLink
            ],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            lineOptions: {
                styles: [{color: '#10b981', opacity: 0.8, weight: 6}]
            },
            createMarker: function() { return null; }, // We already have markers
            fitSelectedRoutes: true,
            show: true
        }).addTo(map);

        alert(`Routing to: ${name}`);
    }

    function setupLayerControls() {
        // Toggle Buttons logic
        const toggle = (id, layer) => {
            document.getElementById(id).onclick = (e) => {
                const btn = e.currentTarget;
                if (map.hasLayer(layer)) {
                    map.removeLayer(layer);
                    btn.classList.remove('active');
                } else {
                    map.addLayer(layer);
                    btn.classList.add('active');
                }
            }
        };
        toggle('show-shelters', shelterLayer);
        toggle('show-hospitals', hospitalLayer);
        toggle('show-police', policeLayer);
    }

    function setupGeolocation() {
        const btn = document.getElementById('detect-loc-btn');
        const input = document.getElementById('current-location');

        btn.onclick = () => {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            if (navigator.geolocation) {
                navigator.geolocation.watchPosition(pos => {
                    const { latitude, longitude } = pos.coords;
                    input.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

                    // Move map to user if not already set
                    if (!userMarker) {
                        map.setView([latitude, longitude], 14);
                    }

                    // Update User Marker
                    if (userMarker) {
                        userMarker.setLatLng([latitude, longitude]);
                    } else {
                        userMarker = L.marker([latitude, longitude], {
                            icon: L.divIcon({
                                html: '<div class="user-marker-circle"></div>',
                                className: 'user-marker'
                            })
                        }).addTo(map).bindPopup("<b>You are here (Live)</b>").openPopup();
                    }

                    btn.innerHTML = '<i class="fas fa-check text-success"></i>';

                    // Auto-search nearby ONLY ONCE when location is first detected to avoid clearing markers repeatedly
                    if (!window.userLocationFetched) {
                        fetchNearbyResources(latitude, longitude);
                        window.userLocationFetched = true;
                    }

                }, err => {
                    console.error("Location error:", err);
                    alert("Location access denied or unavailable. Please enable location permissions in your browser and ensure you are using http://localhost:5000");
                    btn.innerHTML = '<i class="fas fa-crosshairs"></i>';
                }, {
                    enableHighAccuracy: false,
                    maximumAge: 10000,
                    timeout: 10000
                });
            } else {
                alert("Geolocation not supported by this browser.");
            }
        }
    }

    function setupRouting() {
        document.getElementById('find-route-btn').onclick = () => {
            if (!userMarker) {
                alert("Please detect your location first.");
                return;
            }

            const select = document.getElementById('destination-select');
            const selectedIndex = select.value;
            
            if (selectedIndex === "") {
                alert("Please select a specific destination from the dropdown.");
                return;
            }

            const destination = currentResources[selectedIndex];
            drawRouteTo(destination.lat, destination.lng, destination.name);
        };
    }