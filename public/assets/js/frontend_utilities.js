function UIUpdate(worker, memory_starting_point) {
    // Re-building registers table
    registers = worker.getRegisters();

    // Update address registers (a0-a7)
    const aRegsEl = document.getElementById('a-registers');
    if (aRegsEl) {
        var HTMLRegistri = sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>a%d</td><td>0x%08x</td></tr>", 0, registers[0], 0, registers[0] >>> 0);
        for (i = 1; i < 8; i++) {
            HTMLRegistri += sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>a%d</td><td>0x%08x</td></tr>", i, registers[i], i, registers[i] >>> 0);
        }
        aRegsEl.innerHTML = HTMLRegistri;
    }

    // Update data registers (d0-d7)
    const dRegsEl = document.getElementById('d-registers');
    if (dRegsEl) {
        var HTMLRegistri = sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>d%d</td><td>0x%08x</td></tr>", 8, registers[8], 0, registers[8] >>> 0);
        for (i = 9; i < 16; i++) {
            HTMLRegistri += sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>d%d</td><td>0x%08x</td></tr>", i, registers[i], i - 8, registers[i] >>> 0);
        }
        dRegsEl.innerHTML = HTMLRegistri;
    }

    // Re-building memory table (only if the element still exists, memory view
    // was trimmed from the UI; this prevented null dereference when the
    // component was removed).
    const memEl = document.getElementById('memory');
    if (memEl) {
        let number = parseInt(worker.memory.getByte(memory_starting_point >>> 0), 16);
        var HTMLMemoria = sprintf("<tr><td>0x%08x</td><td>%d</td><td>0x%02x</td><td>%08b</td><td>%s</td></tr>", memory_starting_point, number, number, number, String.fromCharCode(number));

        let loop_starting_position = memory_starting_point + 1;
        let loop_ending_position = memory_starting_point + 10;

        for (i = loop_starting_position; i < loop_ending_position; i++) {
            let number = parseInt(worker.memory.getByte(i >>> 0), 16);
            HTMLMemoria += sprintf("<tr><td>0x%08x</td><td>%d</td><td>0x%02x</td><td>%08b</td><td>%s</td></tr>", i, number, number, number, String.fromCharCode(number));
        }
        memEl.innerHTML = HTMLMemoria;
    }

    // Setting the text for the last elapsed instruction
    const lastInstEl = document.getElementById('last_instruction');
    if (lastInstEl) {
        lastInstEl.innerHTML = worker.getLastInstruction();
    }
    // Setting the text for the program counter
    const pcEl = document.getElementById('PC');
    if (pcEl) {
        pcEl.innerHTML = sprintf("<td>%d</td><td>PC</td><td>0x%08x</td>", worker.getPC(), worker.getPC());
    }    
    //Flags – notify React component if it is listening
    if (window.onFlagsUpdate) {
        window.onFlagsUpdate({
            x: worker.getXFlag(),
            n: worker.getNFlag(),
            z: worker.getZFlag(),
            v: worker.getVFlag(),
            c: worker.getCFlag()
        });
    }
}

function UIReset() {
    // Clearing address registers (a0-a7)
    const aRegsEl = document.getElementById('a-registers');
    if (aRegsEl) {
        var HTMLRegistri = sprintf("<tr><td><input id='0' class='init-value' type='text' value='%d'></td><td>a%d</td><td>0x%08x</td></tr>", 0, 0, 0 >>> 0);
        for (i = 1; i < 8; i++) {
            HTMLRegistri += sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>a%d</td><td>0x%08x</td></tr>", i, 0, i, 0 >>> 0);
        }
        aRegsEl.innerHTML = HTMLRegistri;
    }

    // Clearing data registers (d0-d7)
    const dRegsEl = document.getElementById('d-registers');
    if (dRegsEl) {
        var HTMLRegistri = sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>d%d</td><td>0x%08x</td></tr>", 8, 0, 0, 0 >>> 0);
        for (i = 9; i < 16; i++) {
            HTMLRegistri += sprintf("<tr><td><input id='%d' class='init-value' type='text' value='%d'></td><td>d%d</td><td>0x%08x</td></tr>", i, 0, i - 8, 0 >>> 0);
        }
        dRegsEl.innerHTML = HTMLRegistri;
    }

    // Clearing memory table only if element exists
    const memEl = document.getElementById('memory');
    if (memEl) {
        var HTMLMemoria = sprintf("<tr><td>0x%08x</td><td>%d</td><td>0x%02x</td><td>%08b</td><td> </td></tr>", 0, 0, 0 >>> 0, 0 >>> 0);

        for (i = 1; i < 10; i++) {
            HTMLMemoria += sprintf("<tr><td>0x%08x</td><td>%d</td><td>0x%02x</td><td>%08b</td><td> </td></tr>", i, 0, 0 >>> 0, 0 >>> 0);
        }
        memEl.innerHTML = HTMLMemoria;
    }

    const lastInstEl = document.getElementById('last_instruction');
    if (lastInstEl) {
        lastInstEl.innerHTML = Strings.LAST_INSTRUCTION_DEFAULT_TEXT;
    }

    const pcEl = document.getElementById('PC');
    if (pcEl) {
        pcEl.innerHTML = "<td>0</td><td>PC</td><td>0</td>";
    }
     //Flags
     if (window.onFlagsUpdate) {
         window.onFlagsUpdate({ x:0,n:0,z:0,v:0,c:0 });
     } 
}

function initializeRegisters() {
    worker.registers[0] = parseInt(document.getElementById("0").value);
    worker.registers[1] = parseInt(document.getElementById("1").value);
    worker.registers[2] = parseInt(document.getElementById("2").value);
    worker.registers[3] = parseInt(document.getElementById("3").value);
    worker.registers[4] = parseInt(document.getElementById("4").value);
    worker.registers[5] = parseInt(document.getElementById("5").value);
    worker.registers[6] = parseInt(document.getElementById("6").value);
    worker.registers[7] = parseInt(document.getElementById("7").value);
    worker.registers[8] = parseInt(document.getElementById("8").value);
    worker.registers[9] = parseInt(document.getElementById("9").value);
    worker.registers[10] = parseInt(document.getElementById("10").value);
    worker.registers[11] = parseInt(document.getElementById("11").value);
    worker.registers[12] = parseInt(document.getElementById("12").value);
    worker.registers[13] = parseInt(document.getElementById("13").value);
    worker.registers[14] = parseInt(document.getElementById("14").value);
    worker.registers[15] = parseInt(document.getElementById("15").value);
}

function registersDownload() {
    if (!worker) {
        alert("Please run the emulator first before downloading registers.");
        return;
    }
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(worker.registers));
    // the actual anchor element now has its own id; the button merely triggers
    // the click handler and does not receive the href attributes.
    var dlAnchorElem = document.getElementById('registerDownloadAnchor');
    if (!dlAnchorElem) return;
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "registers.json");
    dlAnchorElem.click();
}

function memoryDownload() {
    if (!worker) {
        alert("Please run the emulator first before downloading memory.");
        return;
    }
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(worker.memory.memory));
    var dlAnchorElem = document.getElementById('memoryDownload');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "memory.json");
    dlAnchorElem.click();
}

function setLastInstruction(instruction) {
    document.getElementById('last_instruction').innerHTML = instruction;
}

function displayErrors(errors) {
    var html = "Errors<br>";
    for(var i = 0; i < errors.length; i++) {
        html += errors[i] + "<br>";
    }
    document.getElementById('last_instruction').innerHTML = html;
}

// memory and MMIO toggles are no longer used; removed per UI simplification

