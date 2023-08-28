        
        var editor = window.editor;
        var ended = false;
        var started = false;
        var stopped = false;
        var worker;
        var memory_starting_point = 0;
        var register_changed = false;

        function go() {
            
            if(ended) UIReset();
            ended = false;
            stopped = false;

            if(!started) {
                // Disabling the step button
                document.getElementById('step').setAttribute("disabled","disabled");

                // Retrieving the code
                var code = editor;
                // Retriving the user desired delay in seconds -> milliseconds
                var delay = parseInt(document.getElementById('delay').value) * 1000;
                console.log("Starting emulation with delay of " + delay + "ms");

                worker = new Emulator(code);

                // Managing pre processing exceptions
                if(worker.getException()) {
                    setLastInstruction(worker.getException());
                    return;
                }
                var registers = new Int32Array(16);
            }
                        
            //Initializing and running the loop at the same time
            (function work() {
                
                // Initializing registers with user provided values
                initializeRegisters();
                // If the program is not ended
                if(!stopped && !worker.emulationStep()) {
                    // Updating UI
                    UIUpdate(worker, memory_starting_point);
                    // Delaying the next step if the user put a delay
                    setTimeout(work, delay);
                } else {
                    // Flagging the program as ended
                    ended = true;
                    if(worker.getException())
                        setLastInstruction(worker.getException());
                    if(worker.getErrors().length != 0) {
                        displayErrors(worker.getErrors());
                    }
                }                    
            })();
        }

        function step() {
            if(ended)   
                return;               
                
            if(!started) {
                // Retrieving the code
                var code = editor;

                worker = new Emulator(code);
                // Managing pre processing exceptions
                if(worker.getException()) {
                    setLastInstruction(worker.getException());
                    return;
                }
                var registers = new Int32Array(16);
                started = true;
            }

            // If any register was manually changed
            initializeRegisters();

            if(!worker.emulationStep()) {
                UIUpdate(worker, memory_starting_point);
            } else {
                UIUpdate(worker, memory_starting_point);
                ended = true;
                if(worker.getException())
                    setLastInstruction(worker.getException());
                if(worker.getErrors().length != 0) {
                    displayErrors(worker.getErrors());
                }
                document.getElementById('step').setAttribute("disabled","disabled");
            }
        }

        function reset() {
            console.log("Emulation reset1");
            ended = false;
            started = false;
            stopped = true;
            memory_starting_point = 0;
            UIReset();
            console.log("Emulation reset");
           // document.getElementById('step').removeAttribute("disabled");
        }

        function moveMemory() {
            var startsAt = document.getElementById('memory-address').value;
            startsAt = startsAt.substring(2);
            memory_starting_point = parseInt(startsAt, 16);
            UIUpdate(worker, parseInt(startsAt, 16));
        }
        
        function memoryNext() {
            memory_starting_point += 10;
            UIUpdate(worker, memory_starting_point);
        }
        
        function memoryPrevious() {
            if(memory_starting_point >= 10)
                memory_starting_point -= 10;
            else 
                memory_starting_point = 0;
            UIUpdate(worker, memory_starting_point);
        }

        function undo() {
            worker.undoFromStack();
            UIUpdate(worker, memory_starting_point);
        }