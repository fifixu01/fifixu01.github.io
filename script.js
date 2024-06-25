let drivers = [];
const daysOfWeek = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

function saveDriversToLocalStorage() {
    console.log("Saving drivers to local storage:", drivers);
    localStorage.setItem('drivers', JSON.stringify(drivers));
}

function loadDriversFromLocalStorage() {
    const driversJSON = localStorage.getItem('drivers');
    if (driversJSON) {
        drivers = JSON.parse(driversJSON).map(driver => ({
            name: driver.name,
            basePay: Number(driver.basePay || 0),
            threshold: driver.threshold,
            dailyPays: driver.dailyPays || Array(7).fill(0),
            weeklyPay: driver.weeklyPay || 0,
            hoursWorked: driver.hoursWorked || 0,
            payPerHour: driver.payPerHour || 0
        }));
        updateDriverListTable();
        updatePayInfoTable();
        updateEditDriverDropdown();
    }
}

function savePayInfoToLocalStorage() {
    localStorage.setItem('payInfo', JSON.stringify(drivers));
}

function loadPayInfoFromLocalStorage() {
    const payInfoJSON = localStorage.getItem('payInfo');
    if (payInfoJSON) {
        const payInfo = JSON.parse(payInfoJSON);
        drivers.forEach((driver, index) => {
            if (payInfo[index]) {
                driver.dailyPays = payInfo[index].dailyPays || Array(7).fill(0);
                driver.weeklyPay = payInfo[index].weeklyPay || 0;
                driver.hoursWorked = payInfo[index].hoursWorked || 0;
                driver.payPerHour = payInfo[index].payPerHour || 0;
            }
        });
        updatePayInfoTable();
    }
}


function sortDriversByName() {
    drivers.sort((a, b) => a.name.localeCompare(b.name));
}

function updateEditDriverDropdown() {
    const dropdown = document.getElementById('editDriverDropdown');
    dropdown.innerHTML = ''; // Clear existing options
    drivers.forEach((driver, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = driver.name;
        dropdown.appendChild(option);
    });
}

function addDriver() {
    const name = document.getElementById('driverName').value;
    const basePay = parseFloat(document.getElementById('basePay').value);
    const threshold = parseInt(document.getElementById('packageThreshold').value);
    const newDriver = { name, basePay, threshold, dailyPays: Array(7).fill(0), weeklyPay: 0, hoursWorked: 0, payPerHour: 0 };
    drivers.push(newDriver);
    saveDriversToLocalStorage();
    updateDriverListTable();
    sortDriversByName(); 
    updatePayInfoTable();
    clearInputs();
    updateEditDriverDropdown();
    
}

function deleteSelectedDriver() {
    const dropdown = document.getElementById('editDriverDropdown');
    const selectedIndex = dropdown.selectedIndex;
    if (selectedIndex > -1) {
        drivers.splice(selectedIndex, 1); // Remove the selected driver
        saveDriversToLocalStorage();
        updateDriverListTable();
        updatePayInfoTable();
        updateEditDriverDropdown(); // Update dropdown after deleting a driver
    }
}

function updateDriverListTable() {
    const tableBody = document.getElementById('driverListBody');
    tableBody.innerHTML = '';
    drivers.forEach((driver, index) => {
        const row = tableBody.insertRow();
        row.insertCell(0).textContent = driver.name;
        row.insertCell(1).textContent = (driver.basePay || 0).toFixed(2);
        row.insertCell(2).textContent = driver.threshold;
    });
    sortDriversByName(); 
   
}

function setupDaySelection() {
    const daySelect = document.getElementById('daySelect');
    daySelect.addEventListener('change', displayDriverDailyInputs);
}


function displayDriverDailyInputs() {
    const selectedDay = document.getElementById('daySelect').value;
    const dailyInputs = document.getElementById('dailyInputs');
    dailyInputs.innerHTML = drivers.map((driver, index) => `
        <div>
            <strong>${driver.name}</strong>:<br>
            Stops: <input type="number" id="packages-${index}-${selectedDay}" min="0" placeholder="0">
            Hours: <input type="number" id="hours-${index}-${selectedDay}" min="0" step="0.1" placeholder="0">
        </div>
    `).join('');
}


function calculateDailyPays() {
    const selectedDay = document.getElementById('daySelect').value;
    const dayIndex = daysOfWeek.indexOf(selectedDay);

    if (dayIndex === -1) {
        console.error("No day selected");
        return;
    }

    drivers.forEach((driver, index) => {
        const packagesInput = document.getElementById(`packages-${index}-${selectedDay}`);
        const hoursInput = document.getElementById(`hours-${index}-${selectedDay}`);

        const packages = packagesInput && packagesInput.value !== "" ? parseInt(packagesInput.value) : 0;
        const hours = hoursInput && hoursInput.value !== "" ? parseFloat(hoursInput.value) : 0;

        let dailyPay = 0;
        if (packages > 0) {
            dailyPay = driver.basePay + (packages > driver.threshold ? (packages - driver.threshold) * 1 : 0); // Assuming $1 per package above threshold
        }

        driver.dailyPays[dayIndex] = dailyPay;
        driver.hoursWorked += hours; // Accumulate total hours worked in the week
        driver.stops = driver.stops || Array(7).fill(0); // Initialize stops array if not already initialized
        driver.stops[dayIndex] = packages; // Store the stops for the selected day

        // Update weekly pay and average pay per hour
        driver.weeklyPay = driver.dailyPays.reduce((acc, curr) => acc + curr, 0);
        driver.payPerHour = driver.hoursWorked > 0 ? driver.weeklyPay / driver.hoursWorked : 0;

        console.log(`Processed ${driver.name} with packages ${packages} and hours ${hours}, daily pay: ${dailyPay}`);
    });

    updatePayInfoTable();
    savePayInfoToLocalStorage();
}

function updatePayInfoTable() {
    const tableBody = document.getElementById('payInfoBody');
    tableBody.innerHTML = '';

    let totalWeeklyPay = 0;
    let routesPerDay = Array(7).fill(0); // Initialize an array to hold the count of routes per day
    let totalStopsPerDay = Array(7).fill(0); // Initialize an array to hold the total stops per day

    drivers.forEach((driver, index) => {
        let row = tableBody.rows[index];
        if (!row) {
            row = tableBody.insertRow();
            row.insertCell(0).textContent = driver.name;
            daysOfWeek.forEach(() => row.insertCell().textContent = "$0");
            row.insertCell().textContent = "$0"; // Weekly pay
            row.insertCell().textContent = "$0"; // Average hourly pay
        }

        daysOfWeek.forEach((day, dayIndex) => {
            row.cells[dayIndex + 1].textContent = `$${driver.dailyPays[dayIndex].toFixed(0)}`;
            if (driver.dailyPays[dayIndex] > 0) {
                routesPerDay[dayIndex]++; // Count the number of routes for each day
            }
            // Assuming you have a way to get the stops for each day (e.g., driver.stops[dayIndex])
            // You need to track stops delivered in a similar way to dailyPays
            totalStopsPerDay[dayIndex] += driver.stops ? driver.stops[dayIndex] || 0 : 0;
        });

        row.cells[8].textContent = `$${driver.weeklyPay.toFixed(0)}`; // Weekly pay
        row.cells[9].textContent = `$${driver.payPerHour.toFixed(2)}`; // Average hourly pay

        totalWeeklyPay += driver.weeklyPay;
    });

    // Add a new row for the total of all weekly pays
    let totalRow = tableBody.insertRow();
    totalRow.insertCell(0).textContent = "Total Weekly Pay Across All Drivers";
    totalRow.insertCell(1).setAttribute("colspan", "7");  // Span across the day columns
    totalRow.cells[1].style.textAlign = "right";  // Align text to the right for better readability

    let totalPayCell = totalRow.insertCell(2);
    totalPayCell.textContent = `$${totalWeeklyPay.toFixed(0)}`;
    totalPayCell.colSpan = "2";  // Span the last two columns (Total Weekly Pay and Average Hourly Pay)

    // Add a new row for the routes per day
    let routesRow = tableBody.insertRow();
    routesRow.insertCell(0).textContent = "Routes per Day";
    daysOfWeek.forEach((day, dayIndex) => {
        routesRow.insertCell(dayIndex + 1).textContent = routesPerDay[dayIndex];
    });
    routesRow.insertCell(8).textContent = ""; // Empty cell for total weekly pay
    routesRow.insertCell(9).textContent = ""; // Empty cell for average hourly pay

    // Add a new row for the average stops per route
    let avgStopsRow = tableBody.insertRow();
    avgStopsRow.insertCell(0).textContent = "Avg. stops per route";
    daysOfWeek.forEach((day, dayIndex) => {
        const avgStops = routesPerDay[dayIndex] > 0 ? (totalStopsPerDay[dayIndex] / routesPerDay[dayIndex]).toFixed(2) : 0;
        avgStopsRow.insertCell(dayIndex + 1).textContent = avgStops;
    });
    avgStopsRow.insertCell(8).textContent = ""; // Empty cell for total weekly pay
    avgStopsRow.insertCell(9).textContent = ""; // Empty cell for average hourly pay
}



function clearPayInfo() {
    drivers.forEach(driver => {
        driver.dailyPays.fill(0);
        driver.weeklyPay = 0;
        driver.hoursWorked = 0;
        driver.payPerHour = 0;
    });
    updatePayInfoTable();
    savePayInfoToLocalStorage();
}

function clearInputs() {
    document.getElementById('driverName').value = '';
    document.getElementById('basePay').value = '';
    document.getElementById('packageThreshold').value = '';
}

// function importData() {
//     const fileInput = document.getElementById('fileInput');
//     const file = fileInput.files[0];
//     if (!file) {
//         alert('Please select a file first.');
//         return;
//     }

//     const reader = new FileReader();
//     reader.onload = function(event) {
//         const data = new Uint8Array(event.target.result);
//         const workbook = XLSX.read(data, { type: 'array' });

//         // Assuming the data is in the first sheet
//         const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
//         const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

//         // Process the sheet data
//         processSheetData(sheetData);
//     };

//     reader.readAsArrayBuffer(file);
// }

// function processSheetData(sheetData) {
//     const daySelect = document.getElementById('daySelect').value;
//     const dayIndex = daysOfWeek.indexOf(daySelect);

//     if (dayIndex === -1) {
//         alert('Please select a valid day.');
//         return;
//     }

//     // Assuming the first row contains headers and the data starts from the second row
//     for (let i = 1; i < sheetData.length; i++) {
//         const row = sheetData[i];

//         // Assuming the columns are: Driver Name, Stops, Hours
//         const driverName = row[0];
//         const stops = row[1];
//         const hours = row[2];

//         const driver = drivers.find(d => d.name === driverName);
//         if (driver) {
//             driver.dailyPays[dayIndex] = driver.basePay + (stops > driver.threshold ? (stops - driver.threshold) * 1 : 0);
//             driver.hoursWorked += hours;
//             driver.weeklyPay = driver.dailyPays.reduce((acc, curr) => acc + curr, 0);
//             driver.payPerHour = driver.hoursWorked > 0 ? driver.weeklyPay / driver.hoursWorked : 0;
//         }
//     }

//     updatePayInfoTable();
//     savePayInfoToLocalStorage();
//     alert('Data imported successfully.');
// }

function exportTableToExcel(tableId, defaultFilename = 'Driver_Pay') {
    const filename = prompt('Enter the filename for the Excel file:', defaultFilename);
    if (!filename) {
        alert('Export cancelled. Please provide a valid filename.');
        return;
    }
    
    const table = document.getElementById(tableId);
    const workbook = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
    const excelFileName = `${filename}.xlsx`;
    XLSX.writeFile(workbook, excelFileName);
}

window.onload = function() {
    loadDriversFromLocalStorage();
    loadPayInfoFromLocalStorage();
    setupDaySelection();
    updateDriverListTable();
    updatePayInfoTable();
    updateEditDriverDropdown();
};
