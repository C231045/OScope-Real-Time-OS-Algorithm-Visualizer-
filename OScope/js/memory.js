document.addEventListener("DOMContentLoaded", function () {
    const algorithmSelect = document.getElementById("memoryAlgorithm");
    const blocksInput = document.getElementById("memoryBlocksInput");
    const processesInput = document.getElementById("memoryProcessesInput");

    const runMemoryBtn = document.getElementById("runMemory");
    const resetMemoryBtn = document.getElementById("resetMemory");

    const memoryVisual = document.getElementById("memoryVisual");
    const allocatedCountEl = document.getElementById("allocatedCount");
    const totalUsedMemoryEl = document.getElementById("totalUsedMemory");
    const totalFragmentationEl = document.getElementById("totalFragmentation");
    const memoryResultBody = document.getElementById("memoryResultBody");

    if (!algorithmSelect || !runMemoryBtn) return;

    // Parse comma/space separated positive integers
    function parseSizes(rawText, label) {
        const parts = rawText
            .split(/[\s,]+/)
            .map(item => item.trim())
            .filter(item => item !== "");

        if (parts.length === 0) {
            alert(`Please enter at least one value for ${label}!`);
            return null;
        }

        const numbers = [];
        for (const part of parts) {
            const num = Number(part);
            if (!Number.isFinite(num) || num <= 0) {
                alert(`Invalid value "${part}" in ${label}. Enter positive numbers only.`);
                return null;
            }
            numbers.push(num);
        }

        return numbers;
    }

    // Core Memory Allocation Logic (First Fit, Best Fit, Worst Fit)
    function allocateMemory(blockSizes, processSizes, strategy) {
        const blocks = blockSizes.map((size, idx) => ({
            id: `Block ${idx + 1}`,
            size: size,
            allocatedProcess: null,
            processSize: 0,
            remaining: size
        }));

        const results = processSizes.map((pSize, pIdx) => {
            const processName = `P${pIdx + 1}`;
            let chosenIndex = -1;

            for (let i = 0; i < blocks.length; i++) {
                if (blocks[i].allocatedProcess === null && blocks[i].size >= pSize) {
                    if (strategy === "first") {
                        chosenIndex = i;
                        break;
                    } else if (strategy === "best") {
                        if (chosenIndex === -1 || blocks[i].size < blocks[chosenIndex].size) {
                            chosenIndex = i;
                        }
                    } else if (strategy === "worst") {
                        if (chosenIndex === -1 || blocks[i].size > blocks[chosenIndex].size) {
                            chosenIndex = i;
                        }
                    }
                }
            }

            if (chosenIndex !== -1) {
                blocks[chosenIndex].allocatedProcess = processName;
                blocks[chosenIndex].processSize = pSize;
                blocks[chosenIndex].remaining = blocks[chosenIndex].size - pSize;

                return {
                    process: processName,
                    size: pSize,
                    blockId: `${blocks[chosenIndex].id} (${blocks[chosenIndex].size} KB)`,
                    remaining: blocks[chosenIndex].remaining,
                    allocated: true
                };
            }

            return {
                process: processName,
                size: pSize,
                blockId: "Not Allocated",
                remaining: "-",
                allocated: false
            };
        });

        return { blocks, results };
    }

    // Render Visual Memory Blocks
    function renderVisualBlocks(blocks) {
        memoryVisual.innerHTML = "";

        blocks.forEach(block => {
            const isAllocated = block.allocatedProcess !== null;
            const usedPercent = isAllocated
                ? Math.round((block.processSize / block.size) * 100)
                : 0;

            const card = document.createElement("div");
            card.className = isAllocated ? "mem-block-card" : "mem-block-card free-block";

            card.innerHTML = `
                <div class="mem-block-header">
                    <strong>${block.id}</strong>
                    <span>${block.size} KB</span>
                </div>
                <div class="mem-bar">
                    ${
                        isAllocated
                            ? `<div class="mem-used" style="width: ${usedPercent}%">${block.allocatedProcess} (${block.processSize} KB)</div>`
                            : ""
                    }
                </div>
                <div class="mem-block-footer">
                    <span>${isAllocated ? `Used: ${block.processSize} KB` : "Status: Free"}</span>
                    <span>Free: ${block.remaining} KB</span>
                </div>
            `;

            memoryVisual.appendChild(card);
        });
    }

    // Render Metrics & Table
    function renderResults(blocks, results) {
        const allocatedList = results.filter(r => r.allocated);
        const totalUsed = allocatedList.reduce((sum, r) => sum + r.size, 0);
        const totalFrag = blocks
            .filter(b => b.allocatedProcess !== null)
            .reduce((sum, b) => sum + b.remaining, 0);

        allocatedCountEl.textContent = `${allocatedList.length} / ${results.length}`;
        totalUsedMemoryEl.textContent = `${totalUsed} KB`;
        totalFragmentationEl.textContent = `${totalFrag} KB`;

        memoryResultBody.innerHTML = "";
        results.forEach(item => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.process}</td>
                <td>${item.size} KB</td>
                <td>${item.blockId}</td>
                <td>${item.allocated ? `${item.remaining} KB` : "-"}</td>
                <td>
                    <span class="status-badge ${item.allocated ? "status-allocated" : "status-unallocated"}">
                        ${item.allocated ? "Allocated" : "Not Allocated"}
                    </span>
                </td>
            `;
            memoryResultBody.appendChild(tr);
        });
    }

    // Run Allocation
    runMemoryBtn.addEventListener("click", function () {
        const blockSizes = parseSizes(blocksInput.value, "Memory Blocks");
        if (!blockSizes) return;

        const processSizes = parseSizes(processesInput.value, "Process Sizes");
        if (!processSizes) return;

        const { blocks, results } = allocateMemory(
            blockSizes,
            processSizes,
            algorithmSelect.value
        );

        renderVisualBlocks(blocks);
        renderResults(blocks, results);
    });

    // Reset
    resetMemoryBtn.addEventListener("click", function () {
        algorithmSelect.value = "first";
        blocksInput.value = "100, 500, 200, 300, 600";
        processesInput.value = "212, 417, 112, 426";

        memoryVisual.innerHTML = `
            <p class="empty-state">
                <i class="fa-solid fa-memory"></i>
                Run allocation to visualize memory blocks.
            </p>
        `;
        allocatedCountEl.textContent = "-- / --";
        totalUsedMemoryEl.textContent = "-- KB";
        totalFragmentationEl.textContent = "-- KB";
        memoryResultBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell">
                    No allocation results yet.
                </td>
            </tr>
        `;
    });
});