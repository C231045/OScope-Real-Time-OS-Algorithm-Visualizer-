document.addEventListener("DOMContentLoaded", function () {
    const cpuAlgorithm = document.getElementById("cpuAlgorithm");
    const quantumControl = document.getElementById("quantumControl");
    const timeQuantum = document.getElementById("timeQuantum");

    const processTableBody = document.getElementById("processTableBody");
    const addProcessBtn = document.getElementById("addProcess");
    const runCPUBtn = document.getElementById("runCPU");
    const resetCPUBtn = document.getElementById("resetCPU");

    const ganttChart = document.getElementById("ganttChart");
    const avgWaitingEl = document.getElementById("avgWaiting");
    const avgTurnaroundEl = document.getElementById("avgTurnaround");
    const totalProcessesEl = document.getElementById("totalProcesses");
    const cpuResultBody = document.getElementById("cpuResultBody");

    if (!cpuAlgorithm || !processTableBody || !runCPUBtn) return;

    let processCounter = 3;

    // Show/Hide Time Quantum input for Round Robin
    function toggleQuantumInput() {
        quantumControl.hidden = cpuAlgorithm.value !== "rr";
    }

    cpuAlgorithm.addEventListener("change", toggleQuantumInput);
    toggleQuantumInput();

    // Update Total Processes counter
    function updateProcessCount() {
        const count = processTableBody.querySelectorAll("tr").length;
        totalProcessesEl.textContent = String(count).padStart(2, "0");
    }

    // Create a new table row
    function createProcessRow(id, arrival = 0, burst = 4, priority = 1) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${id}</td>
            <td><input type="number" value="${arrival}" min="0"></td>
            <td><input type="number" value="${burst}" min="1"></td>
            <td><input type="number" value="${priority}" min="0"></td>
            <td>
                <button class="delete-row" type="button" aria-label="Delete process">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        return tr;
    }

    // Add Process Row
    addProcessBtn.addEventListener("click", function () {
        processCounter++;
        const newRow = createProcessRow(`P${processCounter}`, 0, 4, 1);
        processTableBody.appendChild(newRow);
        updateProcessCount();
    });

    // Delete Process Row (Event Delegation)
    processTableBody.addEventListener("click", function (event) {
        const deleteBtn = event.target.closest(".delete-row");
        if (!deleteBtn) return;

        const rows = processTableBody.querySelectorAll("tr");
        if (rows.length <= 1) {
            alert("At least one process is required!");
            return;
        }

        deleteBtn.closest("tr").remove();
        updateProcessCount();
    });

    // Reset Table & Results
    resetCPUBtn.addEventListener("click", function () {
        processCounter = 3;
        processTableBody.innerHTML = "";
        processTableBody.appendChild(createProcessRow("P1", 0, 5, 2));
        processTableBody.appendChild(createProcessRow("P2", 1, 3, 1));
        processTableBody.appendChild(createProcessRow("P3", 2, 4, 3));

        updateProcessCount();

        ganttChart.innerHTML = `
            <p class="empty-state">
                <i class="fa-solid fa-chart-gantt"></i>
                Run simulation to view Gantt Chart.
            </p>
        `;
        avgWaitingEl.textContent = "-- ms";
        avgTurnaroundEl.textContent = "-- ms";
        cpuResultBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-cell">
                    No simulation results yet.
                </td>
            </tr>
        `;
    });

    // Read & Validate Processes from Table
    function getProcessesFromTable() {
        const rows = Array.from(processTableBody.querySelectorAll("tr"));
        const list = [];

        for (const row of rows) {
            const id = row.cells[0].textContent.trim();
            const inputs = row.querySelectorAll("input");

            const arrival = Number(inputs[0].value);
            const burst = Number(inputs[1].value);
            const priority = Number(inputs[2].value);

            if (
                inputs[0].value === "" ||
                inputs[1].value === "" ||
                inputs[2].value === "" ||
                !Number.isFinite(arrival) ||
                !Number.isFinite(burst) ||
                !Number.isFinite(priority)
            ) {
                alert(`Please enter valid numbers for ${id}!`);
                return null;
            }

            if (arrival < 0 || burst <= 0 || priority < 0) {
                alert(`Invalid values in ${id}: Arrival >= 0, Burst > 0, Priority >= 0.`);
                return null;
            }

            list.push({ id, arrival, burst, priority });
        }

        return list;
    }

    // Helper: Merge consecutive Gantt segments
    function addSegment(chart, id, start, end) {
        if (end <= start) return;
        const last = chart[chart.length - 1];
        if (last && last.id === id && last.end === start) {
            last.end = end;
        } else {
            chart.push({ id, start, end });
        }
    }

    // 1. FCFS
    function runFCFS(list) {
        const sorted = [...list].sort((a, b) => a.arrival - b.arrival);
        let time = 0;
        const chart = [];
        const completed = [];

        sorted.forEach(p => {
            if (time < p.arrival) {
                addSegment(chart, "Idle", time, p.arrival);
                time = p.arrival;
            }
            const start = time;
            time += p.burst;
            addSegment(chart, p.id, start, time);
            completed.push({ ...p, completion: time });
        });

        return { chart, completed };
    }

    // 2. SJF (Non-Preemptive)
    function runSJF(list) {
        let remaining = [...list];
        let time = 0;
        const chart = [];
        const completed = [];

        while (remaining.length > 0) {
            const available = remaining
                .filter(p => p.arrival <= time)
                .sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);

            if (available.length === 0) {
                const next = Math.min(...remaining.map(p => p.arrival));
                addSegment(chart, "Idle", time, next);
                time = next;
                continue;
            }

            const p = available[0];
            const start = time;
            time += p.burst;
            addSegment(chart, p.id, start, time);
            completed.push({ ...p, completion: time });
            remaining = remaining.filter(x => x.id !== p.id);
        }

        return { chart, completed };
    }

    // 3. SRTF (Preemptive)
    function runSRTF(list) {
        const remaining = list.map(p => ({ ...p, left: p.burst }));
        let time = 0;
        const chart = [];
        const completed = [];

        while (completed.length < list.length) {
            const available = remaining
                .filter(p => p.arrival <= time && p.left > 0)
                .sort((a, b) => a.left - b.left || a.arrival - b.arrival);

            if (available.length === 0) {
                const next = Math.min(...remaining.filter(p => p.left > 0).map(p => p.arrival));
                addSegment(chart, "Idle", time, next);
                time = next;
                continue;
            }

            const p = available[0];
            addSegment(chart, p.id, time, time + 1);
            p.left--;
            time++;

            if (p.left === 0) {
                completed.push({ ...p, completion: time });
            }
        }

        return { chart, completed };
    }

    // 4. Priority (Non-Preemptive, Lower number = Higher priority)
    function runPriority(list) {
        let remaining = [...list];
        let time = 0;
        const chart = [];
        const completed = [];

        while (remaining.length > 0) {
            const available = remaining
                .filter(p => p.arrival <= time)
                .sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);

            if (available.length === 0) {
                const next = Math.min(...remaining.map(p => p.arrival));
                addSegment(chart, "Idle", time, next);
                time = next;
                continue;
            }

            const p = available[0];
            const start = time;
            time += p.burst;
            addSegment(chart, p.id, start, time);
            completed.push({ ...p, completion: time });
            remaining = remaining.filter(x => x.id !== p.id);
        }

        return { chart, completed };
    }

    // 5. Round Robin
    function runRR(list, quantum) {
        const sorted = list
            .map(p => ({ ...p, left: p.burst }))
            .sort((a, b) => a.arrival - b.arrival);

        const queue = [];
        const chart = [];
        const completed = [];
        let time = 0;
        let next = 0;

        while (completed.length < sorted.length) {
            while (next < sorted.length && sorted[next].arrival <= time) {
                queue.push(sorted[next]);
                next++;
            }

            if (queue.length === 0) {
                const nextTime = sorted[next].arrival;
                addSegment(chart, "Idle", time, nextTime);
                time = nextTime;
                continue;
            }

            const p = queue.shift();
            const start = time;
            const execute = Math.min(quantum, p.left);
            time += execute;
            p.left -= execute;

            addSegment(chart, p.id, start, time);

            while (next < sorted.length && sorted[next].arrival <= time) {
                queue.push(sorted[next]);
                next++;
            }

            if (p.left > 0) {
                queue.push(p);
            } else {
                completed.push({ ...p, completion: time });
            }
        }

        return { chart, completed };
    }

    // Render Gantt Chart
    function renderGantt(chart) {
        ganttChart.innerHTML = "";
        chart.forEach(seg => {
            const block = document.createElement("div");
            block.className = seg.id === "Idle" ? "gantt-block idle" : "gantt-block";
            block.innerHTML = `
                <strong>${seg.id}</strong>
                <span>${seg.start} - ${seg.end}</span>
            `;
            ganttChart.appendChild(block);
        });
    }

    // Render Metrics & Table
    function renderResults(completed) {
        const rows = completed
            .map(p => {
                const turnaround = p.completion - p.arrival;
                const waiting = turnaround - p.burst;
                return { ...p, turnaround, waiting };
            })
            .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

        const n = rows.length;
        const avgWait = rows.reduce((sum, r) => sum + r.waiting, 0) / n;
        const avgTat = rows.reduce((sum, r) => sum + r.turnaround, 0) / n;

        avgWaitingEl.textContent = `${avgWait.toFixed(2)} ms`;
        avgTurnaroundEl.textContent = `${avgTat.toFixed(2)} ms`;

        cpuResultBody.innerHTML = "";
        rows.forEach(r => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${r.id}</td>
                <td>${r.completion}</td>
                <td>${r.turnaround}</td>
                <td>${r.waiting}</td>
            `;
            cpuResultBody.appendChild(tr);
        });
    }

    // Run Simulation Click Event
    runCPUBtn.addEventListener("click", function () {
        const processes = getProcessesFromTable();
        if (!processes) return;

        let output;
        switch (cpuAlgorithm.value) {
            case "fcfs":
                output = runFCFS(processes);
                break;
            case "sjf":
                output = runSJF(processes);
                break;
            case "srtf":
                output = runSRTF(processes);
                break;
            case "priority":
                output = runPriority(processes);
                break;
            case "rr": {
                const q = Number(timeQuantum.value);
                if (!Number.isInteger(q) || q <= 0) {
                    alert("Please enter a valid positive integer for Time Quantum!");
                    return;
                }
                output = runRR(processes, q);
                break;
            }
            default:
                return;
        }

        renderGantt(output.chart);
        renderResults(output.completed);
    });

    updateProcessCount();
});