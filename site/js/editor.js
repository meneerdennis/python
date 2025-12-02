// Pyodide loader
let pyodideReadyPromise = null;
async function getPyodideInstance() {
  if (!pyodideReadyPromise) pyodideReadyPromise = loadPyodide();
  return pyodideReadyPromise;
}

document.addEventListener("DOMContentLoaded", async () => {
  const editorDivs = document.querySelectorAll(".python-editor");
  const instances = [];

  editorDivs.forEach((div) => {
    const rawInitial =
      div.getAttribute("data-initial-code") || "print('Hallo!')";
    const initialCode = rawInitial.replace(/\\n/g, "\n");
    let tests = [];
    const rawTests = div.getAttribute("data-tests");
    if (rawTests) {
      try {
        tests = JSON.parse(rawTests);
      } catch {}
    }

    const editor = CodeMirror(div, {
      value: initialCode,
      mode: "python",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
    });

    // Find buttons and output elements by searching through the document
    // rather than relying on nextElementSibling (which breaks due to <p> tags)
    let runButton = null;
    let output = null;
    let checkButton = null;
    let feedback = null;

    // Search for run button and output in the entire document
    const allButtons = document.querySelectorAll(".python-run");
    const allOutputs = document.querySelectorAll(".python-output");
    const allCheckButtons = document.querySelectorAll(".python-check");
    const allFeedback = document.querySelectorAll(".python-feedback");

    // Use the first available elements for the first editor, second for second editor, etc.
    const editorIndex = instances.length;

    if (allButtons.length > editorIndex) {
      // Find the run button that comes after this editor
      const editors = document.querySelectorAll(".python-editor");
      const currentEditorIndex = Array.from(editors).indexOf(div);
      runButton = allButtons[currentEditorIndex] || null;
    }

    if (allOutputs.length > editorIndex) {
      const editors = document.querySelectorAll(".python-editor");
      const currentEditorIndex = Array.from(editors).indexOf(div);
      output = allOutputs[currentEditorIndex] || null;
    }

    if (allCheckButtons.length > editorIndex) {
      const editors = document.querySelectorAll(".python-editor");
      const currentEditorIndex = Array.from(editors).indexOf(div);
      checkButton = allCheckButtons[currentEditorIndex] || null;
    }

    if (allFeedback.length > editorIndex) {
      const editors = document.querySelectorAll(".python-editor");
      const currentEditorIndex = Array.from(editors).indexOf(div);
      feedback = allFeedback[currentEditorIndex] || null;
    }

    instances.push({ editor, runButton, output, checkButton, feedback, tests });
  });

  const pyodide = await getPyodideInstance();

  instances.forEach(({ editor, runButton, output }) => {
    if (!runButton || !output) return;
    runButton.addEventListener("click", async () => {
      output.textContent = "Bezig met uitvoeren...";
      try {
        let buffer = "";
        pyodide.setStdout({ batched: (d) => (buffer += d + "\n") });
        pyodide.setStderr({ batched: (d) => (buffer += d + "\n") });
        await pyodide.runPythonAsync(editor.getValue());
        output.textContent = buffer || "(Geen output)";
      } catch (err) {
        output.textContent = "Fout:\n" + err;
      }
    });
  });

  instances.forEach(({ editor, checkButton, feedback, tests }) => {
    if (!checkButton || !feedback) return;
    checkButton.addEventListener("click", async () => {
      if (!tests.length) {
        feedback.textContent = "Geen tests.";
        return;
      }
      feedback.textContent = "Nakijken...";
      try {
        let buffer = "";
        pyodide.setStdout({ batched: (d) => (buffer += d + "\n") });
        pyodide.setStderr({ batched: (d) => (buffer += d + "\n") });
        await pyodide.runPythonAsync(editor.getValue());
        const harness = `
tests = ${JSON.stringify(tests)}
def _run():
    p=0;t=len(tests)
    for expr,exp in tests:
        try:
            res=eval(expr)
            if res==exp:
                print("✅",expr,"==",exp);p+=1
            else:
                print("❌",expr,"verwacht",exp,"maar kreeg",res)
        except Exception as e:
            print("⚠️",expr,"fout:",e)
    print(f"Resultaat: {p}/{t} tests geslaagd")
_run()
`;
        await pyodide.runPythonAsync(harness);
        feedback.textContent = buffer || "(Geen testuitvoer)";
      } catch (err) {
        feedback.textContent = "Fout tijdens testen:\n" + err;
      }
    });
  });
});
