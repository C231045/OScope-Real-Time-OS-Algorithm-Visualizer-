document.addEventListener("DOMContentLoaded", function () {
    const algorithmSelect = document.getElementById("pageAlgorithm");
    const referenceInput = document.getElementById("referenceStringInput");
    const frameCountInput = document.getElementById("frameCountInput");

    const runPageBtn = document.getElementById("runPage");
    const resetPageBtn = document.getElementById("resetPage");

    const pageFrameVisual = document.getElementById("pageFrameVisual");
    const totalFaultsEl = document.getElementById("totalPageFaults");
    const totalHitsEl = document.getElementById("totalPageHits");
    const hitRatioEl = document.getElementById("pageHitRatio");

    if (!algorithmSelect || !runPageBtn) return;

    // Parse Reference String
    function parseReferenceString(raw) {
        const parts = raw
            .split(/[\s,]+/)
            .map(item => item.trim())
            .filter(item => item !== "");

        if (parts.length === 0) {
            alert("Please enter a valid Page Reference String!");
            return null;
        }

        const refs = [];
        for (const p of parts) {
            const num = Number(p);
            if (!Number.isInteger(num) || num < 0) {
                alert(`Invalid page number "${p}". Enter non-negative integers only.`);
                return null;
            }
            refs.push(num);
        }
        return refs;
    }

    // 1. FIFO Algorithm
    function simulateFIFO(refs, capacity) {
        const frames = Array(capacity).fill(null);
        let pointer = 0;
        let faults = 0;
        let hits = 0;
        const steps = [];

        refs.forEach(page => {
            const existingIdx = frames.indexOf(page);
            let isHit = existingIdx !== -1;
            let changedIndex = -1;

            if (isHit) {
                hits++;
            } else {
                faults++;
                frames[pointer] = page;
                changedIndex = pointer;
                pointer = (pointer + 1) % capacity;
            }

            steps.push({
                page,
                frames: [...frames],
                isHit,
                changedIndex
            });
        });

        return { steps, faults, hits };
    }

    // 2. LRU Algorithm
    function simulateLRU(refs, capacity) {
        const frames = Array(capacity).fill(null);
        const lastUsed = Array(capacity).fill(-1);
        let faults = 0;
        let hits = 0;
        const steps = [];

        refs.forEach((page, currentIndex) => {
            const existingIdx = frames.indexOf(page);
            let isHit = existingIdx !== -1;
            let changedIndex = -1;

            if (isHit) {
                hits++;
                lastUsed[existingIdx] = currentIndex;
            } else {
                faults++;
                let targetIdx = frames.indexOf(null);

                if (targetIdx === -1) {
                    // Find frame with smallest lastUsed index
                    targetIdx = 0;
                    for (let i = 1; i < capacity; i++) {
                        if (lastUsed[i] < lastUsed[targetIdx]) {
                            targetIdx = i;
                        }
                    }
                }

                frames[targetIdx] = page;
                lastUsed[targetIdx] = currentIndex;
                changedIndex = targetIdx;
            }

            steps.push({
                page,
                frames: [...frames],
                isHit,
                changedIndex
            });
        });

        return { steps, faults, hits };
    }

    // 3. Optimal Algorithm
    function simulateOptimal(refs, capacity) {
        const frames = Array(capacity).fill(null);
        let faults = 0;
        let hits = 0;
        const steps = [];

        refs.forEach((page, currentIndex) => {
            const existingIdx = frames.indexOf(page);
            let isHit = existingIdx !== -1;
            let changedIndex = -1;

            if (isHit) {
                hits++;
            } else {
                faults++;
                let targetIdx = frames.indexOf(null);

                if (targetIdx === -1) {
                    // Find frame used farthest in the future (or never)
                    let farthestUse = -1;
                    targetIdx = 0;

                    for (let i = 0; i < capacity; i++) {
                        const nextUse = refs.indexOf(frames[i], currentIndex + 1);
                        if (nextUse === -1) {
                            targetIdx = i;
                            break;
                        }
                        if (nextUse > farthestUse) {
                            farthestUse = nextUse;
                            targetIdx = i;
                        }
                    }
                }

                frames[targetIdx] = page;
                changedIndex = targetIdx;
            }

            steps.push({
                page,
                frames: [...frames],
                isHit,
                changedIndex
            });
        });

        return { steps, faults, hits };
    }

    // Render Step-by-Step Frame Table
    function renderPageTable(steps, capacity) {
        const table = document.createElement("table");
        table.className = "page-step-table";

        // Header Row: Reference String
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        headerRow.innerHTML = `<th>Reference</th>` +
            steps.map(s => `<th>${s.page}</th>`).join("");
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body Rows: Frames + Status
        const tbody = document.createElement("tbody");

        for (let f = 0; f < capacity; f++) {
            const row = document.createElement("tr");
            let cellsHTML = `<th>Frame ${f + 1}</th>`;

            steps.forEach(s => {
                const val = s.frames[f];
                if (val === null) {
                    cellsHTML += `<td class="cell-empty">-</td>`;
                } else if (s.changedIndex === f) {
                    cellsHTML += `<td class="cell-changed">${val}</td>`;
                } else {
                    cellsHTML += `<td>${val}</td>`;
                }
            });

            row.innerHTML = cellsHTML;
            tbody.appendChild(row);
        }

        // Status Row (Hit / Fault)
        const statusRow = document.createElement("tr");
        statusRow.innerHTML = `<th>Status</th>` +
            steps.map(s =>
                s.isHit
                    ? `<td class="page-status-hit">HIT</td>`
                    : `<td class="page-status-fault">FAULT</td>`
            ).join("");
        tbody.appendChild(statusRow);

        table.appendChild(tbody);
        pageFrameVisual.innerHTML = "";
        pageFrameVisual.appendChild(table);
    }

    // Run Simulation
    runPageBtn.addEventListener("click", function () {
        const refs = parseReferenceString(referenceInput.value);
        if (!refs) return;

        const capacity = Number(frameCountInput.value);
        if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10) {
            alert("Please enter a valid number of frames (1 to 10)!");
            return;
        }

        let result;
        switch (algorithmSelect.value) {
            case "fifo":
                result = simulateFIFO(refs, capacity);
                break;
            case "lru":
                result = simulateLRU(refs, capacity);
                break;
            case "optimal":
                result = simulateOptimal(refs, capacity);
                break;
            default:
                return;
        }

        renderPageTable(result.steps, capacity);

        const total = refs.length;
        const ratio = ((result.hits / total) * 100).toFixed(1);

        totalFaultsEl.textContent = result.faults;
        totalHitsEl.textContent = result.hits;
        hitRatioEl.textContent = `${ratio} %`;
    });

    // Reset
    resetPageBtn.addEventListener("click", function () {
        algorithmSelect.value = "fifo";
        referenceInput.value = "7 0 1 2 0 3 0 4 2 3";
        frameCountInput.value = "3";

        pageFrameVisual.innerHTML = `
            <p class="empty-state">
                <i class="fa-solid fa-layer-group"></i>
                Run simulation to view step-by-step page frames.
            </p>
        `;
        totalFaultsEl.textContent = "--";
        totalHitsEl.textContent = "--";
        hitRatioEl.textContent = "-- %";
    });
});