/*************************************************
 *   NEW EDITOR.JS – supports:
 *   - syntax tests (tests.syntax)
 *   - print_output tests (["print_output", "expected"])
 *   - eval expression tests ([["expr", expected], ...])
 *************************************************/

let pyodideReadyPromise = null;

// Load Pyodide once
async function getPyodideInstance() {
  if (!pyodideReadyPromise) {
    pyodideReadyPromise = loadPyodide();
  }
  return pyodideReadyPromise;
}

document.addEventListener("DOMContentLoaded", async () => {
  const editors = document.querySelectorAll(".python-editor");
  const instances = [];

  // Initialize all editor instances
  editors.forEach((div) => {
    const rawInitial = div.getAttribute("data-initial-code") || "";
    const initialCode = rawInitial.replace(/\\n/g, "\n");

    let tests = null;
    const rawTests = div.getAttribute("data-tests");
    if (rawTests) {
      try {
        tests = JSON.parse(rawTests);
      } catch (e) {
        console.warn("Kon tests niet parsen voor editor:", e);
        tests = null;
      }
    }

    // Create CodeMirror editor
    const editor = CodeMirror(div, {
      value: initialCode,
      mode: "python",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
    });

    // Find buttons and output elements by searching through the entire document
    // rather than relying on nextElementSibling (which breaks due to element positioning)
    let runBtn = null;
    let output = null;
    let checkBtn = null;
    let feedback = null;

    // Search for all elements in the document
    const allButtons = document.querySelectorAll(".python-run");
    const allOutputs = document.querySelectorAll(".python-output");
    const allCheckButtons = document.querySelectorAll(".python-check");
    const allFeedback = document.querySelectorAll(".python-feedback");

    // Use the first available elements for the first editor, second for second editor, etc.
    const editorIndex = instances.length;

    if (allButtons.length > editorIndex) {
      const editors = document.querySelectorAll(".python-editor");
      const currentEditorIndex = Array.from(editors).indexOf(div);
      runBtn = allButtons[currentEditorIndex] || null;
    }

    if (allOutputs.length > editorIndex) {
      const editors = document.querySelectorAll(".python-editor");
      const currentEditorIndex = Array.from(editors).indexOf(div);
      output = allOutputs[currentEditorIndex] || null;
    }

    if (allCheckButtons.length > editorIndex) {
      const editors = document.querySelectorAll(".python-editor");
      const currentEditorIndex = Array.from(editors).indexOf(div);
      checkBtn = allCheckButtons[currentEditorIndex] || null;
    }

    if (allFeedback.length > editorIndex) {
      const editors = document.querySelectorAll(".python-editor");
      const currentEditorIndex = Array.from(editors).indexOf(div);
      feedback = allFeedback[currentEditorIndex] || null;
    }

    instances.push({
      editor,
      runBtn,
      output,
      checkBtn,
      feedback,
      tests,
    });
  });

  const pyodide = await getPyodideInstance();

  /*******************************
   * RUN BUTTON
   ******************************/
  instances.forEach(({ editor, runBtn, output }) => {
    if (!runBtn || !output) return;

    runBtn.addEventListener("click", async () => {
      output.textContent = "Bezig met uitvoeren...\n";

      try {
        let buffer = "";

        pyodide.setStdout({ batched: (data) => (buffer += data + "\n") });
        pyodide.setStderr({ batched: (data) => (buffer += data + "\n") });

        await pyodide.runPythonAsync(editor.getValue());

        output.textContent = buffer || "(Geen output)";
      } catch (err) {
        output.textContent = "Fout:\n" + err;
      }
    });
  });

  /*******************************
   * NAKIJK-BUTTON
   ******************************/
  instances.forEach(({ editor, checkBtn, feedback, tests }) => {
    if (!checkBtn || !feedback) return;

    checkBtn.addEventListener("click", async () => {
      const userCode = editor.getValue();

      // Geen tests → melding
      if (!tests) {
        feedback.textContent = "Geen tests ingesteld.";
        return;
      }

      /*********************************************
       * TYPE 1 — SYNTAX TEST:
       * tests = { "syntax": "print(\":-)\")" }
       *********************************************/
      if (typeof tests === "object" && !Array.isArray(tests) && tests.syntax) {
        let required = tests.syntax;

        if (userCode.includes(required)) {
          feedback.textContent = "✅ Correcte syntax: " + required;
        } else {
          feedback.textContent =
            "❌ Foute syntax.\nJe moet exact gebruiken:\n    " + required;
        }
        return;
      }

      /*********************************************
       * TYPE 2 — PRINT OUTPUT TEST:
       * tests = [ ["print_output", ":-)"] ]
       *********************************************/
      if (Array.isArray(tests) && tests.length > 0) {
        const first = tests[0];

        if (first[0] === "print_output") {
          const expected = first[1];

          feedback.textContent = "Output wordt gecontroleerd...\n";

          try {
            let buffer = "";

            pyodide.setStdout({
              batched: (data) => (buffer += data + "\n"),
            });
            pyodide.setStderr({
              batched: (data) => (buffer += data + "\n"),
            });

            await pyodide.runPythonAsync(userCode);

            const actual = buffer.trim();

            if (actual === expected) {
              feedback.textContent = "✅ Juiste output: " + expected;
            } else {
              feedback.textContent =
                `❌ Verkeerde output.\n` +
                `Verwacht: ${expected}\n` +
                `Gekregen: ${actual}`;
            }
          } catch (err) {
            feedback.textContent = "Fout tijdens uitvoeren:\n" + err;
          }

          return; // klaar
        }
      }

      /*********************************************
       * TYPE 3 — EVAL TESTS:
       * tests = [ ["som(1,2)", 3], ... ]
       *********************************************/
      if (!Array.isArray(tests) || tests.length === 0) {
        feedback.textContent = "Geen geldige tests.";
        return;
      }

      feedback.textContent = "Tests worden uitgevoerd...\n";

      try {
        let buffer = "";

        pyodide.setStdout({
          batched: (d) => (buffer += d + "\n"),
        });
        pyodide.setStderr({
          batched: (d) => (buffer += d + "\n"),
        });

        // leerling-code uitvoeren
        await pyodide.runPythonAsync(userCode);

        // Python harnas draaien
        const pyTestsLiteral = JSON.stringify(tests);
        const harness = `
tests = ${pyTestsLiteral}

def _run_tests():
    passed = 0
    total = len(tests)
    for expr, expected in tests:
        try:
            result = eval(expr)
            if result == expected:
                print("✅", expr, "==", expected)
                passed += 1
            else:
                print("❌", expr, "verwacht", expected, "maar kreeg", result)
        except Exception as e:
            print("⚠️", expr, "gaf een fout:", e)
    print(f"\\nResultaat: {passed}/{total} tests geslaagd")

_run_tests()
`;

        await pyodide.runPythonAsync(harness);

        feedback.textContent = buffer || "(Geen testuitvoer)";
      } catch (err) {
        feedback.textContent = "Fout tijdens nakijken:\n" + err;
      }
    });
  });
});
