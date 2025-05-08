const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Replace with your actual spreadsheet ID
const SHEET_NAME = 'Sheet1';         // Replace with the name of your sheet
const API_KEY = 'YOUR_API_KEY'; // Replace with your API key

document.addEventListener('DOMContentLoaded', function() {
    const sizeSelect = document.getElementById('size-select');
    const bodySelect = document.getElementById('body-select');
    const referenceSelect = document.getElementById('reference-select');
    const displayButton = document.getElementById('display-button');
    const resultsDiv = document.getElementById('results');
    const errorMessageDiv = document.getElementById('error-message');

    const bodyLists = {
        '1/4': [
            { name: 'coralreef', value: 'coralreef' },
            { name: 'dfh', value: 'dfh' }
        ],
        '1/3': [
            { name: 'iplehouse', value: 'iplehouse' },
            { name: 'as60', value: 'as60' }
        ],
        '75': [
            { name: 'id75', value: 'id75' }
        ]
    };

    sizeSelect.addEventListener('change', function() {
        const selectedSize = this.value;
        bodySelect.innerHTML = '<option value="" disabled selected>-- Select a Body --</option>';
        referenceSelect.innerHTML = '<option value="" disabled selected>-- Select a Reference Body --</option>';

        if (bodyLists[selectedSize]) {
            bodyLists[selectedSize].forEach(body => {
                bodySelect.add(new Option(body.name, body.value));
                referenceSelect.add(new Option(body.name, body.value)); // Populate reference select as well
            });
        }
        // Disable the reference dropdown if size is not selected.
        referenceSelect.disabled = !selectedSize;

    });

    bodySelect.addEventListener('change', function() {
        referenceSelect.disabled = !this.value;
    });

    displayButton.addEventListener('click', function() {
        const selectedSize = sizeSelect.value;
        const selectedBody = bodySelect.value;
        const selectedReference = referenceSelect.value;

        errorMessageDiv.textContent = '';
        resultsDiv.innerHTML = '';

        if (!selectedSize || !selectedBody || !selectedReference) {
            errorMessageDiv.textContent = 'Please select a size, a body, and a reference body.';
            return;
        }

        fetchMeasurementData(selectedBody, selectedReference);
    });

    function fetchMeasurementData(selectedBody, selectedReference) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                processSheetData(data.values, selectedBody, selectedReference);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                errorMessageDiv.textContent = 'Failed to fetch data from the Google Sheet. Please check your spreadsheet ID and API key, and ensure the sheet is shared correctly.';
                resultsDiv.innerHTML = ''; // Clear previous results
            });
    }

    function processSheetData(dataValues, selectedBody, selectedReference) {
        if (!dataValues || dataValues.length === 0) {
            errorMessageDiv.textContent = 'No data found in the Google Sheet.';
            resultsDiv.innerHTML = '';
            return;
        }

        const headerRow = dataValues[0];
        const bodyIndex = headerRow.findIndex(header => header.toLowerCase() === selectedBody.toLowerCase());
        const referenceIndex = headerRow.findIndex(header => header.toLowerCase() === selectedReference.toLowerCase());

        if (bodyIndex === -1) {
            errorMessageDiv.textContent = `Body "${selectedBody}" not found in the Google Sheet header row.  Available names are: ${headerRow.join(", ")}`;
            resultsDiv.innerHTML = '';
            return;
        }
         if (referenceIndex === -1) {
            errorMessageDiv.textContent = `Reference Body "${selectedReference}" not found in the Google Sheet header row. Available names are: ${headerRow.join(", ")}`;
            resultsDiv.innerHTML = '';
            return;
        }

        let bodyData = dataValues.find(row => row[bodyIndex]);
        let referenceData = dataValues.find(row => row[referenceIndex]);

        if (!bodyData) {
            errorMessageDiv.textContent = `No data found for body "${selectedBody}".`;
            resultsDiv.innerHTML = '';
            return;
        }
        if (!referenceData){
             errorMessageDiv.textContent = `No data found for reference body "${selectedReference}".`;
            resultsDiv.innerHTML = '';
            return;
        }

        // Ensure both arrays have the same length, if not, pad the shorter array with empty strings.
        if (bodyData.length > referenceData.length) {
            while (referenceData.length < bodyData.length) {
                referenceData.push("");
            }
        } else if (referenceData.length > bodyData.length) {
            while (bodyData.length < referenceData.length) {
                bodyData.push("");
            }
        }
        

        let resultsHTML = '<h3>Measurements:</h3><table><tr><th>Measurement</th><th>' + selectedBody + '</th><th>' + selectedReference + '</th><th>Difference</th></tr>';
        for (let i = 0; i < headerRow.length; i++) {
            if (i !== 0) { // Skip the first column (usually the category/measurement name)
                const measurementName = headerRow[i];
                const bodyValue = bodyData[i] ? bodyData[i] : "N/A";
                const referenceValue = referenceData[i] ? referenceData[i] : "N/A";

                let difference = "N/A";
                if (bodyValue && referenceValue && !isNaN(parseFloat(bodyValue)) && !isNaN(parseFloat(referenceValue))) {
                    difference = (parseFloat(bodyValue) - parseFloat(referenceValue)).toFixed(2);
                }

                resultsHTML += `<tr><td>${measurementName}</td><td>${bodyValue}</td><td>${referenceValue}</td><td>${difference}</td></tr>`;
            }
        }
        resultsHTML += '</table>';
        resultsDiv.innerHTML = resultsHTML;
    }
});