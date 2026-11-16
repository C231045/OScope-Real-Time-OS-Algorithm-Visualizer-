document.addEventListener("DOMContentLoaded", function () {
    const runComparisonBtn = document.getElementById("runComparison");
    const compareQuantumInput = document.getElementById("compareQuantumInput");
    const processTableBody = document.getElementById("processTableBody");

    const barChartContainer = document.getElementById("comparisonBarChart");
    const comparisonResultBody = document.getElementById("comparisonResultBody");
    const bestAlgoBadge = document.getElementById("bestAlgoBadge");

    if (!runComparisonBtn || !processTableBody) return;

    function readProcesses() {
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
                arrival < 0 ||
                burst <= 0 ||
                priority < 0
            ) {
                alert(`Please check inputs in CPU Scheduling table for ${id}!`);
                return null;
            }
            list.push({ id, arrival, burst, priority });
        }
        return list;
    }

    function calcAverages(completed) {
        const n = completed.length;
        let totalWait = 0;
        let totalTat = 0;

        completed.forEach(p => {
            const tat = p.completion - p.arrival;
            const wait = tat - p.burst;
            totalTat += tat;
            totalWait += wait;
        });

        return {
            avgWait: totalWait / n,
            avgTat: totalTat / n
        };
    }

    function simFCFS(list) {
        const sorted = [...list].sort((a, b) => a.arrival - b.arrival);
        let time = 0;
        const completed = sorted.map(p => {
            if (time < p.arrival) time = p.arrival;
            time += p.burst;
            return { ...p, completion: time };
        });
        return calcAverages(completed);
    }

    function simSJF(list) {
        let remaining = [...list];
        let time = 0;
        const completed = [];
        while (remaining.length > 0) {
            const avail = remaining
                .filter(p => p.arrival <= time)
                .sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
            if (avail.length === 0) {
                time = Math.min(...remaining.map(p => p.arrival));
                continue;
            }
            const p = avail[0];
            time += p.burst;
            completed.push({ ...p, completion: time });
            remaining = remaining.filter(x => x.id !== p.id);
        }
        return calcAverages(completed);
    }

    function simSRTF(list) {
        const remaining = list.map(p => ({ ...p, left: p.burst }));
        let time = 0;
        const completed = [];
        while (completed.length < list.length) {
            const avail = remaining
                .filter(p => p.arrival <= time && p.left > 0)
                .sort((a, b) => a.left - b.left || a.arrival - b.arrival);
            if (avail.length === 0) {
                time = Math.min(...remaining.filter(p => p.left > 0).map(p => p.arrival));
                continue;
            }
            const p = avail[0];
            p.left--;
            time++;
            if (p.left === 0) {
                completed.push({ ...p, completion: time });
            }
        }
        return calcAverages(completed);
    }

    function simPriority(list) {
        let remaining = [...list];
        let time = 0;
        const completed = [];
        while (remaining.length > 0) {
            const avail = remaining
                .filter(p => p.arrival <= time)
                .sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);
            if (avail.length === 0) {
                time = Math.min(...remaining.map(p => p.arrival));
                continue;
            }
            const p = avail[0];
            time += p.burst;
            completed.push({ ...p, completion: time });
            remaining = remaining.filter(x => x.id !== p.id);
        }
        return calcAverages(completed);
    }

    function simRR(list, quantum) {
        const sorted = list
            .map(p => ({ ...p, left: p.burst }))
            .sort((a, b) => a.arrival - b.arrival);
        const queue = [];
        const completed = [];
        let time = 0;
        let next = 0;

        while (completed.length < sorted.length) {
            while (next < sorted.length && sorted[next].arrival <= time) {
                queue.push(sorted[next]);
                next++;
            }
            if (queue.length === 0) {
                time = sorted[next].arrival;
                continue;
            }
            const p = queue.shift();
            const exec = Math.min(quantum, p.left);
            time += exec;
            p.left -= exec;

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
        return calcAverages(completed);
    }

    function renderBarChart(metrics) {
        const maxVal = Math.max(...metrics.map(m => m.avgTat), 1);
        const maxBarHeight = 140;

        barChartContainer.innerHTML = "";
        metrics.forEach(item => {
            const waitHeight = Math.max((item.avgWait / maxVal) * maxBarHeight, 6);
            const tatHeight = Math.max((item.avgTat / maxVal) * maxBarHeight, 6);

            const group = document.createElement("div");
            group.className = "bar-group";
            group.innerHTML = `
                <div class="bars-pair">
                    <div class="bar-col">
                        <span class="bar-value">${item.avgWait.toFixed(2)}</span>
                        <div class="bar-fill bar-wait" style="height: ${waitHeight}px;"></div>
                    </div>
                    <div class="bar-col">
                        <span class="bar-value">${item.avgTat.toFixed(2)}</span>
                        <div class="bar-fill bar-tat" style="height: ${tatHeight}px;"></div>
                    </div>
                </div>
                <span class="bar-label">${item.shortName}</span>
            `;
            barChartContainer.appendChild(group);
        });
    }

    function renderTable(metrics, minWait) {
        comparisonResultBody.innerHTML = "";

        metrics.forEach(item => {
            const isBest = Math.abs(item.avgWait - minWait) < 0.001;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.name}</td>
                <td>${item.avgWait.toFixed(2)} ms</td>
                <td>${item.avgTat.toFixed(2)} ms</td>
                <td>
                    ${
                        isBest
                            ? `<span class="status-badge status-allocated">Lowest Waiting Time</span>`
                            : `<span style="color: var(--text-muted);">Standard</span>`
                    }
                </td>
            `;
            comparisonResultBody.appendChild(tr);
        });
    }

    runComparisonBtn.addEventListener("click", function () {
        const processes = readProcesses();
        if (!processes) return;

        const quantum = Number(compareQuantumInput.value);
        if (!Number.isInteger(quantum) || quantum <= 0) {
            alert("Please enter a valid positive Time Quantum!");
            return;
        }

        const results = [
            { name: "First Come First Serve (FCFS)", shortName: "FCFS", ...simFCFS(processes) },
            { name: "Shortest Job First (SJF)", shortName: "SJF", ...simSJF(processes) },
            { name: "Shortest Remaining Time First (SRTF)", shortName: "SRTF", ...simSRTF(processes) },
            { name: "Priority Scheduling", shortName: "Priority", ...simPriority(processes) },
            { name: `Round Robin (Q=${quantum})`, shortName: `RR (Q=${quantum})`, ...simRR(processes, quantum) }
        ];

        const minWait = Math.min(...results.map(r => r.avgWait));
        const bestAlgos = results
            .filter(r => Math.abs(r.avgWait - minWait) < 0.001)
            .map(r => r.shortName)
            .join(", ");

        bestAlgoBadge.textContent = `Best: ${bestAlgos}`;

        renderBarChart(results);
        renderTable(results, minWait);
    });
});