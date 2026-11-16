document.addEventListener("DOMContentLoaded", function () {
    const algorithmSelect = document.getElementById("diskAlgorithm");
    const headInput = document.getElementById("diskHeadInput");
    const diskSizeInput = document.getElementById("diskSizeInput");
    const scanDirectionControl = document.getElementById("scanDirectionControl");
    const scanDirectionSelect = document.getElementById("scanDirection");
    const requestsInput = document.getElementById("diskRequestsInput");

    const runDiskBtn = document.getElementById("runDisk");
    const resetDiskBtn = document.getElementById("resetDisk");

    const seekSequenceBox = document.getElementById("seekSequenceBox");
    const diskChartVisual = document.getElementById("diskChartVisual");
    const totalSeekCountEl = document.getElementById("totalSeekCount");
    const avgSeekLengthEl = document.getElementById("avgSeekLength");
    const totalDiskRequestsEl = document.getElementById("totalDiskRequests");
    const diskResultBody = document.getElementById("diskResultBody");

    if (!algorithmSelect || !runDiskBtn) return;

    // Show/Hide SCAN direction selector
    function toggleScanDirection() {
        scanDirectionControl.hidden = algorithmSelect.value !== "scan";
    }

    algorithmSelect.addEventListener("change", toggleScanDirection);
    toggleScanDirection();

    // Parse Track Requests
    function parseRequests(raw, maxTrack) {
        const parts = raw
            .split(/[\s,]+/)
            .map(item => item.trim())
            .filter(item => item !== "");

        if (parts.length === 0) {
            alert("Please enter at least one track request!");
            return null;
        }

        const list = [];
        for (const p of parts) {
            const num = Number(p);
            if (!Number.isInteger(num) || num < 0 || num > maxTrack) {
                alert(`Invalid track "${p}". Tracks must be integers between 0 and ${maxTrack}.`);
                return null;
            }
            list.push(num);
        }
        return list;
    }

    // 1. FCFS Disk Scheduling
    function simulateDiskFCFS(head, requests) {
        const sequence = [head, ...requests];
        return buildSteps(sequence);
    }

    // 2. SSTF Disk Scheduling
    function simulateDiskSSTF(head, requests) {
        const remaining = [...requests];
        const sequence = [head];
        let current = head;

        while (remaining.length > 0) {
            let closestIdx = 0;
            let minDist = Math.abs(remaining[0] - current);

            for (let i = 1; i < remaining.length; i++) {
                const dist = Math.abs(remaining[i] - current);
                if (dist < minDist) {
                    minDist = dist;
                    closestIdx = i;
                }
            }

            current = remaining[closestIdx];
            sequence.push(current);
            remaining.splice(closestIdx, 1);
        }

        return buildSteps(sequence);
    }

    // 3. SCAN (Elevator) Disk Scheduling
    function simulateDiskSCAN(head, requests, maxTrack, direction) {
        const left = requests.filter(r => r < head).sort((a, b) => b - a);
        const right = requests.filter(r => r >= head).sort((a, b) => a - b);
        const sequence = [head];

        if (direction === "right") {
            sequence.push(...right);
            if (left.length > 0) {
                if (sequence[sequence.length - 1] !== maxTrack) {
                    sequence.push(maxTrack);
                }
                sequence.push(...left);
            }
        } else {
            sequence.push(...left);
            if (right.length > 0) {
                if (sequence[sequence.length - 1] !== 0) {
                    sequence.push(0);
                }
                sequence.push(...right);
            }
        }

        return buildSteps(sequence);
    }

    // Helper: Calculate Step Distances
    function buildSteps(sequence) {
        const steps = [];
        let totalMovement = 0;

        for (let i = 0; i < sequence.length - 1; i++) {
            const from = sequence[i];
            const to = sequence[i + 1];
            const distance = Math.abs(to - from);
            totalMovement += distance;
            steps.push({ step: i + 1, from, to, distance });
        }

        return { sequence, steps, totalMovement };
    }

    // Render Seek Sequence Pills
    function renderSequence(sequence) {
        seekSequenceBox.innerHTML = "";
        sequence.forEach((track, idx) => {
            const node = document.createElement("span");
            node.className = idx === 0 ? "seek-node head-start" : "seek-node";
            node.textContent = idx === 0 ? `${track} (Head)` : track;
            seekSequenceBox.appendChild(node);

            if (idx < sequence.length - 1) {
                const arrow = document.createElement("i");
                arrow.className = "fa-solid fa-arrow-right seek-arrow";
                seekSequenceBox.appendChild(arrow);
            }
        });
    }

    // Render SVG Head Movement Chart
    function renderSVGChart(sequence, maxTrack) {
        const width = 760;
        const rowHeight = 42;
        const padLeft = 45;
        const padRight = 45;
        const padTop = 45;
        const padBottom = 30;
        const plotWidth = width - padLeft - padRight;
        const height = padTop + padBottom + (sequence.length - 1) * rowHeight;

        const scaleX = val => padLeft + (val / maxTrack) * plotWidth;

        // Reference ticks on top axis
        const tickValues = Array.from(new Set([0, ...sequence, maxTrack])).sort((a, b) => a - b);

        let svgContent = `
            <svg class="disk-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
                <!-- Top Axis Line -->
                <line x1="${padLeft}" y1="${padTop - 15}" x2="${width - padRight}" y2="${padTop - 15}"
                      stroke="rgba(130, 165, 220, 0.35)" stroke-width="1.5" />
        `;

        // Vertical guide lines & track labels
        tickValues.forEach(val => {
            const x = scaleX(val);
            svgContent += `
                <line x1="${x}" y1="${padTop - 20}" x2="${x}" y2="${height - padBottom + 10}"
                      stroke="rgba(130, 165, 220, 0.1)" stroke-dasharray="4 4" />
                <text x="${x}" y="${padTop - 25}" fill="#a0aec5" font-size="10" font-weight="600" text-anchor="middle">
                    ${val}
                </text>
            `;
        });

        // Connecting path segments
        for (let i = 0; i < sequence.length - 1; i++) {
            const x1 = scaleX(sequence[i]);
            const y1 = padTop + i * rowHeight;
            const x2 = scaleX(sequence[i + 1]);
            const y2 = padTop + (i + 1) * rowHeight;

            svgContent += `
                <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                      stroke="#35d9f5" stroke-width="2.5" />
            `;
        }

        // Points & value badges
        sequence.forEach((val, idx) => {
            const cx = scaleX(val);
            const cy = padTop + idx * rowHeight;
            const isStart = idx === 0;

            svgContent += `
                <circle cx="${cx}" cy="${cy}" r="${isStart ? 6 : 5}"
                        fill="${isStart ? "#36d399" : "#388bff"}"
                        stroke="#ffffff" stroke-width="1.5" />
                <text x="${cx}" y="${cy - 10}" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">
                    ${val}
                </text>
            `;
        });

        svgContent += `</svg>`;
        diskChartVisual.innerHTML = svgContent;
    }

    // Render Metrics & Table
    function renderResults(steps, totalMovement, requestCount) {
        const avgSeek = (totalMovement / requestCount).toFixed(2);

        totalSeekCountEl.textContent = `${totalMovement} tracks`;
        avgSeekLengthEl.textContent = `${avgSeek} tracks`;
        totalDiskRequestsEl.textContent = String(requestCount).padStart(2, "0");

        diskResultBody.innerHTML = "";
        steps.forEach(s => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>Step ${s.step}</td>
                <td>${s.from}</td>
                <td>${s.to}</td>
                <td>${s.distance}</td>
            `;
            diskResultBody.appendChild(tr);
        });
    }

    // Run Simulation
    runDiskBtn.addEventListener("click", function () {
        const diskSize = Number(diskSizeInput.value);
        if (!Number.isInteger(diskSize) || diskSize < 10) {
            alert("Please enter a valid Disk Size (minimum 10)!");
            return;
        }

        const maxTrack = diskSize - 1;
        const head = Number(headInput.value);
        if (headInput.value === "" || !Number.isInteger(head) || head < 0 || head > maxTrack) {
            alert(`Initial Head Position must be an integer between 0 and ${maxTrack}!`);
            return;
        }

        const requests = parseRequests(requestsInput.value, maxTrack);
        if (!requests) return;

        let result;
        switch (algorithmSelect.value) {
            case "fcfs":
                result = simulateDiskFCFS(head, requests);
                break;
            case "sstf":
                result = simulateDiskSSTF(head, requests);
                break;
            case "scan":
                result = simulateDiskSCAN(head, requests, maxTrack, scanDirectionSelect.value);
                break;
            default:
                return;
        }

        renderSequence(result.sequence);
        renderSVGChart(result.sequence, maxTrack);
        renderResults(result.steps, result.totalMovement, requests.length);
    });

    // Reset
    resetDiskBtn.addEventListener("click", function () {
        algorithmSelect.value = "fcfs";
        headInput.value = "50";
        diskSizeInput.value = "200";
        scanDirectionSelect.value = "right";
        requestsInput.value = "82, 170, 43, 140, 24, 16, 190";
        toggleScanDirection();

        seekSequenceBox.innerHTML = `
            <p class="empty-state">
                <i class="fa-solid fa-route"></i>
                Run simulation to view seek sequence.
            </p>
        `;
        diskChartVisual.innerHTML = `
            <p class="empty-state">
                <i class="fa-solid fa-chart-line"></i>
                Run simulation to visualize disk head movement.
            </p>
        `;
        totalSeekCountEl.textContent = "-- tracks";
        avgSeekLengthEl.textContent = "-- tracks";
        totalDiskRequestsEl.textContent = "--";
        diskResultBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-cell">
                    No simulation results yet.
                </td>
            </tr>
        `;
    });
});