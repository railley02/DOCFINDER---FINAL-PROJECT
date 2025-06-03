// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', function () {

    // --- MAP INITIALIZATION ---
    // Initialize the map and set its view to approximate Quezon City coordinates and a zoom level
    // Coordinates for Quezon City (approximate center)
    const quezonCityCoords = [14.6760, 121.0437];
    const map = L.map('map').setView(quezonCityCoords, 13); // 13 is a good starting zoom level

    // Add a tile layer to the map (OpenStreetMap is free)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // --- DATA STORAGE & UI ELEMENTS ---
    let allHospitals = []; // To store the fetched hospital data
    const medicalNeedSelect = document.getElementById('medicalNeed');
    const hospitalListElement = document.getElementById('hospitalList');

    // --- FUNCTION TO FETCH HOSPITAL DATA ---
    async function fetchHospitalData() {
        try {
            // Ensure the correct path to data.json
            const response = await fetch('./data.json'); // Adjusted path to ensure it works
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allHospitals = await response.json();
            console.log("Hospitals loaded:", allHospitals);
            // Initially display all hospitals or a default message
            displayHospitals(allHospitals);
        } catch (error) {
            console.error("Could not fetch hospital data:", error);
            hospitalListElement.innerHTML = '<li>Error loading hospital data. Please try again later.</li>';
        }
    }

    // --- FUNCTION TO DISPLAY HOSPITALS ON THE LIST AND MAP ---
    function displayHospitals(hospitalsToDisplay) {
        hospitalListElement.innerHTML = ''; // Clear current list
        map.eachLayer(function (layer) { // Clear existing markers from map
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        if (hospitalsToDisplay.length === 0) {
            hospitalListElement.innerHTML = '<li>No facilities found matching your criteria.</li>';
            return;
        }

        hospitalsToDisplay.forEach(hospital => {
            // Add to list
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <strong>${hospital.name}</strong><br>
                Address: ${hospital.address}<br>
                Services: ${hospital.services.join(', ')}<br>
                Contact: ${hospital.contact} | Hours: ${hospital.hours}
            `;
            hospitalListElement.appendChild(listItem);

            // Add marker to map
            if (hospital.latitude && hospital.longitude) {
                const marker = L.marker([hospital.latitude, hospital.longitude]).addTo(map);
                marker.bindPopup(`<b>${hospital.name}</b><br>${hospital.address}<br>Services: ${hospital.services.join(', ')}`);
            }
        });
    }

    // --- EVENT LISTENER FOR MEDICAL NEED BUTTONS ---
    document.querySelectorAll('.medical-need-button').forEach(button => {
        button.addEventListener('click', function() {
            const selectedNeed = button.getAttribute('data-need').trim().toLowerCase(); // Get need from button
            console.log("Selected Medical Need:", selectedNeed); // Debugging log

            if (!selectedNeed) {
                alert("Please select a medical need."); // Replace alert with a nicer message display later
                displayHospitals(allHospitals); // Show all if nothing specific is selected
                return;
            }

            // Filter hospitals based on the selected medical need
            const filteredHospitals = allHospitals.filter(hospital =>
                hospital.services.some(service => service.toLowerCase() === selectedNeed) // Exact match
            );

            console.log("Filtered Hospitals:", filteredHospitals); // Debugging log

            if (filteredHospitals.length === 0) {
                console.warn(`No hospitals found for the selected need: ${selectedNeed}`);
            }

            // Display filtered hospitals on the map and list
            displayHospitals(filteredHospitals);
        });
    });

    // --- INITIAL DATA LOAD ---
    fetchHospitalData();

});