document.addEventListener('DOMContentLoaded', function () {
    const quezonCityCoords = [14.6760, 121.0437];
    const map = L.map('map').setView(quezonCityCoords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let allHospitals = [];
    const medicalNeedSelect = document.getElementById('medicalNeed');
    const hospitalListElement = document.getElementById('hospitalList');

    async function fetchHospitalData() {
        try {
            const response = await fetch('./data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allHospitals = await response.json();
            displayHospitals(allHospitals);
        } catch (error) {
            console.error("Could not fetch hospital data:", error);
            hospitalListElement.innerHTML = '<li>Error loading hospital data. Please try again later.</li>';
        }
    }

    function displayHospitals(hospitalsToDisplay) {
        hospitalListElement.innerHTML = '';
        map.eachLayer(function (layer) {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        if (hospitalsToDisplay.length === 0) {
            hospitalListElement.innerHTML = '<li>No facilities found matching your criteria.</li>';
            return;
        }

        hospitalsToDisplay.forEach(hospital => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <strong>${hospital.name}</strong><br>
                Address: ${hospital.address}<br>
                Services: ${hospital.services.join(', ')}<br>
                Contact: ${hospital.contact} | Hours: ${hospital.hours}
            `;
            hospitalListElement.appendChild(listItem);

            if (hospital.latitude && hospital.longitude) {
                const marker = L.marker([hospital.latitude, hospital.longitude]).addTo(map);
                marker.bindPopup(`<b>${hospital.name}</b><br>${hospital.address}<br>Services: ${hospital.services.join(', ')}`);
            }
        });
    }

    document.querySelectorAll('.medical-need-button').forEach(button => {
        button.addEventListener('click', function() {
            const selectedNeed = button.getAttribute('data-need').trim().toLowerCase();

            if (!selectedNeed) {
                alert("Please select a medical need.");
                displayHospitals(allHospitals);
                return;
            }

            const filteredHospitals = allHospitals.filter(hospital =>
                hospital.services.some(service => service.toLowerCase() === selectedNeed)
            );

            displayHospitals(filteredHospitals);
        });
    });

    fetchHospitalData();
});