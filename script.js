document.addEventListener('DOMContentLoaded', function() {
    const sizeSelect = document.getElementById('size-select');
    const bodySelect = document.getElementById('body-select');
    const referenceSelect = document.getElementById('reference-select');
    const displayButton = document.getElementById('display-button');
    const resultsDiv = document.getElementById('results');
    const errorMessageDiv = document.getElementById('error-message');

    const urlList = {
        '1/3 girl': `bjd measurements - 1_3 dolls(girl).csv`,
        '1/4 girl': `bjd measurements - 1_4 dolls(girl).csv`,
        '68 boy': `bjd measurements - 68 boys.csv`
    }

    sizeSelect.addEventListener('change', function() {
        const selectedSize = this.value;
        bodySelect.innerHTML = '<option value="" disabled selected>-- Select a Body --</option>';
        referenceSelect.innerHTML = '<option value="" disabled selected>-- Select a Reference Body --</option>';

        
        fetchSupportedDolls(selectedSize)
            .then(supportedDolls => {
                console.log("Supported Dolls:", supportedDolls);
                supportedDolls.forEach(element => {
            bodySelect.add(new Option(element, element));
            referenceSelect.add(new Option(element, element));
        });
            })
            .catch(error => {
                console.error("Failed to get supported dolls:", error);
            });
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

        fetchMeasurementData(selectedBody, selectedReference, urlList[selectedSize]);
    });

    function fetchMeasurementData(selectedBody, selectedReference, url) {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvValue => {
                processSheetData(csvValue, selectedBody, selectedReference);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                errorMessageDiv.textContent = 'Failed to fetch data from the Google Sheet. Please check your spreadsheet ID and API key, and ensure the sheet is shared correctly.';
                resultsDiv.innerHTML = ''; // Clear previous results
            });
    }

async function fetchSupportedDolls(selectedSize) {
    const url = "bjd measurements - index.csv";

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvValue = await response.text();

        const rows = csvValue.split('\n').map(row => row.split(','));

        // Check if there's at least a header row
        if (rows.length === 0) {
             console.warn("CSV is empty or malformed.");
             return []; // Return empty array if no data
        }

        const sizes = rows.shift(); // Get header row and remove it from data rows

        console.info("Selected Size:", selectedSize);
        console.info("Headers/Sizes:", sizes);

        // Find the index, handling potential whitespace and case
        const selectedIndex = sizes.findIndex(header => header.trim().toLowerCase() === selectedSize.toLowerCase());

        console.info("Selected Index:", selectedIndex);

        // Handle case where size is not found
        if (selectedIndex === -1) {
            console.warn(`Size "${selectedSize}" not found in headers.`);
            return []; // Return empty array if size not found
        }

        // Extract the column data based on the index
        const bodyNames = rows.map(row => {
             // Add a check for row length to prevent errors on malformed rows
             if (row.length > selectedIndex) {
                 return row[selectedIndex].trim(); // Trim whitespace from data too
             } else {
                 console.warn(`Row is shorter than expected at index ${selectedIndex}:`, row);
                 return undefined; // Or handle as appropriate
             }
        }).filter(name => name !== undefined && name !== '');

        return bodyNames;

    } catch (error) {
        console.error('Error fetching data:', error);
        if (typeof resultsDiv !== 'undefined') {
           resultsDiv.innerHTML = '';
        }
        return [];
    }
}

    function processSheetData(dataValues, selectedBody, selectedReference) {
        const rows = dataValues.split('\n').map(row => row.split(','));

        const headerRow = rows.shift(); // this represents measurement fields
        const bjdnames = rows.map(row => row[0]); // this extracts the names of dolls
        console.info(bjdnames);
        const selectedIndex = bjdnames.findIndex(header => header.toLowerCase() === selectedBody.toLowerCase());
        const referenceIndex = bjdnames.findIndex(header => header.toLowerCase() === selectedReference.toLowerCase());

        if (selectedIndex === -1) {
            errorMessageDiv.textContent = `Body "${selectedBody}" not found in the database.`;
            resultsDiv.innerHTML = '';
            return;
        }
         if (referenceIndex === -1) {
            errorMessageDiv.textContent = `Reference Body "${selectedReference}" not found in the database`;
            resultsDiv.innerHTML = '';
            return;
        }

        console.info('reference index is ', referenceIndex, 'reference body is ', selectedReference);

        let bodyData = rows[selectedIndex];
        let referenceData = rows[referenceIndex];

        console.info(rows);
        console.info(referenceData);

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
        

        let resultsHTML = '<h3>Measurements:</h3><table><tr><th>Measurement (unit: cm)</th><th>' + selectedBody + '</th><th>' + selectedReference + '</th><th>Difference</th></tr>';
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