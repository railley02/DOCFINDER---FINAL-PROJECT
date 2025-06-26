function getDistance(lat1, lng1, lat2, lng2) {
        const R = 6371e3;
        const toRad = deg => deg * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
let roadGraph = {};

// STEP 4: A* Pathfinding Algorithm
function runAStar(startKey, goalKey) {
    const openSet = new Set([startKey]);
    const cameFrom = {};
    const gScore = {};
    const fScore = {};

    for (const node in roadGraph) {
        gScore[node] = Infinity;
        fScore[node] = Infinity;
    }
    gScore[startKey] = 0;
    fScore[startKey] = 0;

    while (openSet.size > 0) {
        let current = null;
        let lowestF = Infinity;
        for (const node of openSet) {
            if (fScore[node] < lowestF) {
                lowestF = fScore[node];
                current = node;
            }
        }

        if (current === goalKey) {
            const path = [current];
            while (cameFrom[current]) {
                current = cameFrom[current];
                path.unshift(current);
            }
            return path;
        }

        openSet.delete(current);

        for (const neighbor of roadGraph[current] || []) {
            const tentativeG = gScore[current] + neighbor.weight;
            if (tentativeG < gScore[neighbor.node]) {
                cameFrom[neighbor.node] = current;
                gScore[neighbor.node] = tentativeG;
                const [nLat, nLng] = neighbor.node.split(',').map(Number);
                const [gLat, gLng] = goalKey.split(',').map(Number);
                const h = getDistance(nLat, nLng, gLat, gLng);
                fScore[neighbor.node] = tentativeG + h;
                openSet.add(neighbor.node);
            }
        }
    }

    return null;
}

document.addEventListener('DOMContentLoaded', function () {
    console.log("Script loaded: DOMContentLoaded event fired");

    const quezonCityCoords = [14.6760, 121.0437];
    const map = L.map('map').setView(quezonCityCoords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let allHospitals = [];
    const medicalNeedSelect = document.getElementById('medicalNeed');
    const hospitalListElement = document.getElementById('hospitalList');

    let userLocation = null;
    let userMarker = null;
    let routeLine = null;

    setTimeout(() => {
        console.log("Calling map.locate() for initial geolocation");
        map.locate({ setView: true, maxZoom: 15 });
    }, 500);

    

    function formatCoord(lat, lng) {
        return `${lat.toFixed(6)},${lng.toFixed(6)}`;
    }

    

    function findNearestGraphNode(lat, lng) {
        let nearestKey = null;
        let minDist = Infinity;

        for (const key in roadGraph) {
            const [nLat, nLng] = key.split(',').map(Number);
            const dist = getDistance(lat, lng, nLat, nLng);
            if (dist < minDist) {
                minDist = dist;
                nearestKey = key;
            }
        }

        return nearestKey;
    }

    async function loadRoadGraph() {
        try {
            const res = await fetch('roads-qc.geojson');
            const geojson = await res.json();

            geojson.features.forEach(feature => {
                if (feature.geometry.type === "LineString") {
                    const coords = feature.geometry.coordinates;

                    for (let i = 0; i < coords.length - 1; i++) {
                        const [lng1, lat1] = coords[i];
                        const [lng2, lat2] = coords[i + 1];

                        const key1 = formatCoord(lat1, lng1);
                        const key2 = formatCoord(lat2, lng2);
                        const dist = getDistance(lat1, lng1, lat2, lng2);

                        if (!roadGraph[key1]) roadGraph[key1] = [];
                        if (!roadGraph[key2]) roadGraph[key2] = [];

                        roadGraph[key1].push({ node: key2, weight: dist });
                        roadGraph[key2].push({ node: key1, weight: dist });
                    }
                }
            });

            console.log("Road graph built:", roadGraph);
        } catch (err) {
            console.error("Failed to load road data:", err);
        }
    }

    function navigateToHospital(hospital) {
        if (!userLocation || !roadGraph || Object.keys(roadGraph).length === 0) {
            alert("User location or road graph not available.");
            return;
        }

        const [userLat, userLng] = userLocation;
        const userKey = findNearestGraphNode(userLat, userLng);
        const hospitalKey = findNearestGraphNode(hospital.latitude, hospital.longitude);

        if (!userKey || !hospitalKey) {
            alert("Could not snap locations to the road network.");
            return;
        }

        const path = runAStar(userKey, hospitalKey);

        if (!path || path.length === 0) {
            alert("No path found to the hospital.");
            return;
        }

        const latlngs = path.map(key => {
            const [lat, lng] = key.split(',').map(Number);
            return [lat, lng];
        });

        if (routeLine) {
            map.removeLayer(routeLine);
        }

        routeLine = L.polyline(latlngs, { color: 'blue', weight: 5 }).addTo(map);
        map.fitBounds(routeLine.getBounds());

        const totalDistance = latlngs.reduce((sum, point, index, arr) => {
            if (index === 0) return 0;
            const [prevLat, prevLng] = arr[index - 1];
            return sum + getDistance(prevLat, prevLng, point[0], point[1]);
        }, 0);

        alert(`A* Path to ${hospital.name}: ${(totalDistance / 1000).toFixed(2)} km`);
    }

    async function fetchHospitalData() {
        try {
            const response = await fetch('./data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allHospitals = await response.json();
            console.log("Hospitals loaded:", allHospitals);
            displayHospitals(allHospitals);
        } catch (error) {
            console.error("Could not fetch hospital data:", error);
            hospitalListElement.innerHTML = '<li>Error loading hospital data. Please try again later.</li>';
        }
    }

    function displayHospitals(hospitalsToDisplay) {
        hospitalListElement.innerHTML = '';
        map.eachLayer(function (layer) {
            if (layer instanceof L.Marker && layer !== userMarker) {
                map.removeLayer(layer);
            }
        });

        if (routeLine) {
            map.removeLayer(routeLine);
            routeLine = null;
        }

        if (hospitalsToDisplay.length === 0) {
            hospitalListElement.innerHTML = '<li>No facilities found matching your criteria.</li>';
            return;
        }

        hospitalsToDisplay.forEach(hospital => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <div class="hospital-card">
                    <div class="hospital-card-header">
                    <h3>${hospital.name}</h3>
                    <span class="hospital-tag">${hospital.services[0]}</span>
                    </div>
                    <p><strong>📍 Address:</strong> ${hospital.address}</p>
                    <p><strong>🛠 Services:</strong> ${hospital.services.join(', ')}</p>
                    <p><strong>☎️ Contact:</strong> ${hospital.contact}</p>
                    <p><strong>⏰ Hours:</strong> ${hospital.hours}</p>
                </div>
                `; 
            listItem.style.cursor = "pointer";
            listItem.onclick = () => navigateToHospital(hospital);
            hospitalListElement.appendChild(listItem);

            if (hospital.latitude && hospital.longitude) {
                const marker = L.marker([hospital.latitude, hospital.longitude]).addTo(map);
                marker.bindPopup(`<b>${hospital.name}</b><br>${hospital.address}<br>Services: ${hospital.services.join(', ')}`);
                marker.on('click', () => navigateToHospital(hospital));
            }
        });
    }

    document.querySelectorAll('.medical-need-button').forEach(button => {
        if (button.hasAttribute('data-need')) {
            button.addEventListener('click', async function () {
                // 🔄 Deactivate all buttons
                document.querySelectorAll('.medical-need-button').forEach(b => b.classList.remove('active'));
                // ✅ Activate this one
                button.classList.add('active');

                const selectedNeed = (button.getAttribute('data-need') ?? '').trim().toLowerCase();
                console.log("Selected Medical Need:", selectedNeed);

                if (!selectedNeed) {
                    alert("Please select a medical need.");
                    displayHospitals(allHospitals);
                    return;
                }

                const filteredHospitals = allHospitals.filter(hospital =>
                    hospital.services.some(service => service.toLowerCase() === selectedNeed)
                );

                displayHospitals(filteredHospitals);

                if (!userLocation || filteredHospitals.length === 0) return;

                const userKey = findNearestGraphNode(userLocation[0], userLocation[1]);
                if (!userKey) {
                    alert("Could not snap your location to road network.");
                    return;
                }

                let bestHospital = null;
                let shortestDistance = Infinity;

                for (const hospital of filteredHospitals) {
                    const hospitalKey = findNearestGraphNode(hospital.latitude, hospital.longitude);
                    if (!hospitalKey) continue;

                    const path = runAStar(userKey, hospitalKey);
                    if (!path || path.length === 0) continue;

                    let total = 0;
                    for (let i = 1; i < path.length; i++) {
                        const [lat1, lng1] = path[i - 1].split(',').map(Number);
                        const [lat2, lng2] = path[i].split(',').map(Number);
                        total += getDistance(lat1, lng1, lat2, lng2);
                    }

                    if (total < shortestDistance) {
                        shortestDistance = total;
                        bestHospital = hospital;
                    }
                }

                if (bestHospital) {
                    console.log(`Navigating to closest matching hospital: ${bestHospital.name}`);
                    navigateToHospital(bestHospital);
                } else {
                    alert("No reachable hospital found for this need.");
                }
            });
        }
    });


    const centerLocationBtn = document.getElementById('centerLocationBtn');
    if (centerLocationBtn) {
        centerLocationBtn.addEventListener('click', function () {
            map.locate({ setView: true, maxZoom: 15 });
        });
    }

    map.on('locationfound', function (e) {
        userLocation = [e.latitude, e.longitude];
        if (userMarker) {
            map.removeLayer(userMarker);
        }
        userMarker = L.marker(userLocation, {
            title: "You",
            icon: L.icon({
                iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149060.png',
                iconSize: [32, 32],
                iconAnchor: [16, 32]
            })
        }).addTo(map).bindPopup("Your Location").openPopup();
    });

    map.on('locationerror', function (e) {
        alert("Could not get your location. Please allow location access and try again.\nError: " + e.message);
    });

    loadRoadGraph();
    fetchHospitalData();
});
