class NODE {
  #comp;
  constructor(p_id = 0, arrival_time = 0, burst_time = 0, comp = false) {
    this.p_id = p_id;
    this.arrival_time = arrival_time;
    this.burst_time = burst_time;
    this.remaining_time = burst_time;
    this.start_time = null;
    this.completion_time = 0;
    this.#comp = comp;
    this.color = `hsl(${Math.random() * 360}, 60%, 60%)`;
    this.history = []; //for Gantt
  }
  completed() {
    this.#comp = true;
  }
}

class Round_Robin {
  #nodes;
  constructor(quantum, nodes = []) {
    this.quantum = quantum;
    this.#nodes = nodes.filter((node) => node instanceof NODE);
    this.gantt_log = [];
  }
  avg_w_t() {
    return (
      this.#nodes.reduce((acc, p) => acc + p.waiting_time, 0) /
      this.#nodes.length
    );
  }
  avg_t_t() {
    return (
      this.#nodes.reduce((acc, p) => acc + p.turnaround_time, 0) /
      this.#nodes.length
    );
  }
  avg_r_t() {
    return (
      this.#nodes.reduce((acc, p) => acc + p.response_time, 0) /
      this.#nodes.length
    );
  }

  run() {
    // sort processes by a_t
    const queue = [...this.#nodes].sort(
      (a, b) => a.arrival_time - b.arrival_time,
    );
    let time = 0;
    const readyQueue = [];
    //while there is any procces in $queue has remaining time or rq has any proccess
    while (queue.some((p) => p.remaining_time > 0) || readyQueue.length > 0) {
      // add newly arrived processes to rq
      queue.forEach((p) => {
        //pa_t <= current time and pr_t > 0 and rq doesnt include p :add it
        if (
          p.arrival_time <= time &&
          p.remaining_time > 0 &&
          !readyQueue.includes(p)
        ) {
          readyQueue.push(p);
        }
      });
      // rq is empty then we jump to the next arrival time and skip the iteration
      if (readyQueue.length === 0) {
        // CPU idle, jump to next arriving process
        const next = queue.find((p) => p.remaining_time > 0);
        if (next) time = next.arrival_time;
        continue;
      }
      // Pick the first process in ready queue
      const node = readyQueue.shift();
      //assigning the start time to the process
      if (node.start_time === null) node.start_time = time;
      const slice = Math.min(this.quantum, node.remaining_time);
      this.gantt_log.push({
        id: node.p_id,
        start: time,
        end: time + slice,
        color: node.color,
      });

      node.remaining_time -= slice;
      time += slice;

      // Check for new arrivals DURING the slice before putting process back
      queue.forEach((p) => {
        if (
          p.arrival_time <= time &&
          p.remaining_time > 0 &&
          !readyQueue.includes(p) &&
          p !== node
        ) {
          readyQueue.push(p);
        }
      });

      if (node.remaining_time > 0) readyQueue.push(node);
      else node.completion_time = time;
    }
  }

  getTimes() {
    for (let node of this.#nodes) {
      node.turnaround_time = node.completion_time - node.arrival_time;
      node.waiting_time = node.turnaround_time - node.burst_time;
      node.response_time = node.start_time - node.arrival_time;
    }
  }
  getnodes() {
    return this.#nodes;
  }
}
let rr2 = new Round_Robin();

class SRTF {
  #nodes;
  constructor(nodes = []) {
    this.#nodes = nodes.filter((node) => node instanceof NODE);
    this.gantt_log = [];
  }
  avg_w_t() {
    return (
      this.#nodes.reduce((acc, p) => acc + p.waiting_time, 0) /
      this.#nodes.length
    );
  }
  avg_t_t() {
    return (
      this.#nodes.reduce((acc, p) => acc + p.turnaround_time, 0) /
      this.#nodes.length
    );
  }
  avg_r_t() {
    return (
      this.#nodes.reduce((acc, p) => acc + p.response_time, 0) /
      this.#nodes.length
    );
  }

  run() {
    const queue = [...this.#nodes].sort(
      (a, b) => a.arrival_time - b.arrival_time,
    );
    let time = 0;
    let currentProcess = null;
    const readyQueue = [];

    while (
      queue.some((p) => p.remaining_time > 0) ||
      readyQueue.length > 0 ||
      currentProcess
    ) {
      // add newly arrived processes to readyQueue
      queue.forEach((p) => {
        if (
          p.arrival_time <= time &&
          p.remaining_time > 0 &&
          !readyQueue.includes(p) &&
          p !== currentProcess
        ) {
          readyQueue.push(p);
        }
      });

      // picking shortestproccess
      if (!currentProcess) {
        if (readyQueue.length > 0) {
          currentProcess = readyQueue.reduce(
            (s, p) => (p.remaining_time < s.remaining_time ? p : s),
            readyQueue[0],
          );
          readyQueue.splice(readyQueue.indexOf(currentProcess), 1);
        }
      } else {
        if (readyQueue.length > 0) {
          // checking if preemption is needed
          const shortestInQueue = readyQueue.reduce(
            (s, p) => (p.remaining_time < s.remaining_time ? p : s),
            currentProcess,
          );
          if (shortestInQueue !== currentProcess) {
            readyQueue.push(currentProcess);
            currentProcess = shortestInQueue;
            readyQueue.splice(readyQueue.indexOf(shortestInQueue), 1);
          }
        }
      }

      if (currentProcess) {
        // setting start_time if not already set
        if (currentProcess.start_time === null)
          currentProcess.start_time = time;

        // Log for Gantt
        const last = this.gantt_log[this.gantt_log.length - 1];
        if (last && last.id === currentProcess.p_id) {
          last.end += 1;
        } else {
          this.gantt_log.push({
            id: currentProcess.p_id,
            start: time,
            end: time + 1,
            color: currentProcess.color,
          });
        }
        // execute for 1 time unit
        currentProcess.remaining_time -= 1;
        time += 1;
        // process finishes
        if (currentProcess.remaining_time === 0) {
          currentProcess.completion_time = time;
          currentProcess = null;
        }
      } else {
        // CPU idle(jump to next arriving process)
        const next = queue.find(
          (p) => p.remaining_time > 0 && p.arrival_time > time,
        );
        if (next) time = next.arrival_time;
        else break;
      }
    }
  }
  getTimes() {
    for (let node of this.#nodes) {
      node.turnaround_time = node.completion_time - node.arrival_time;
      node.waiting_time = node.turnaround_time - node.burst_time;
      node.response_time = node.start_time - node.arrival_time;
    }
  }
  getnodes() {
    return this.#nodes;
  }
}

// UI code
let rrData = [
  { a: 0, b: 24 },
  { a: 1, b: 3 },
  { a: 2, b: 3 },
  { a: 3, b: 3 },
];
let srtfData = [
  { a: 0, b: 24 },
  { a: 1, b: 3 },
  { a: 2, b: 3 },
  { a: 3, b: 3 },
];
let S1data = () => {
  rrData = [
    { a: 3, b: 4 },
    { a: 0, b: 3 },
    { a: 4, b: 10 },
    { a: 5, b: 22 },
  ];
  srtfData = [
    { a: 3, b: 4 },
    { a: 0, b: 3 },
    { a: 4, b: 10 },
    { a: 5, b: 22 },
  ];
  renderInputs();
};
let S2data = () => {
  rrData = [
    { a: 0, b: 24 },
    { a: 0, b: 11 },
    { a: 0, b: 11 },
    { a: 0, b: 20 },
    { a: 0, b: 12 },
    { a: 0, b: 3 },
  ];
  srtfData = [
    { a: 0, b: 24 },
    { a: 0, b: 11 },
    { a: 0, b: 11 },
    { a: 0, b: 20 },
    { a: 0, b: 12 },
    { a: 0, b: 3 },
  ];
  renderInputs();
};
let S3data = () => {
  rrData = [
    { a: 5, b: 24 },
    { a: 4, b: 2 },
    { a: 3, b: 10 },
    { a: 2, b: 4 },
    { a: 0, b: 2 },
  ];
  srtfData = [
    { a: 5, b: 24 },
    { a: 4, b: 2 },
    { a: 3, b: 10 },
    { a: 2, b: 4 },
    { a: 0, b: 2 },
  ];
  renderInputs();
};
let defaultdata = () => {
  rrData = [
    { a: 0, b: 24 },
    { a: 1, b: 3 },
    { a: 2, b: 3 },
    { a: 3, b: 3 },
  ];
  srtfData = [
    { a: 0, b: 24 },
    { a: 1, b: 3 },
    { a: 2, b: 3 },
    { a: 3, b: 3 },
  ];
  renderInputs();
};

function isDataValid(type) {
  const data = type === "rr" ? rrData : srtfData;
  if (data.length === 0) {
    alert("Please add at least one process.");
    return false;
  }
  for (let i = 0; i < data.length; i++) {
    if (data[i].a < 0 || data[i].b <= 0) {
      alert(
        `Process P${i + 1} has invalid values. Arrival must be >= 0 and Burst must be > 0.`,
      );
      return false;
    }
  }
  if (type === "rr") {
    const q = +document.getElementById("rr-q").value;
    if (q <= 0) {
      alert("Quantum must be greater than 0.");
      return false;
    }
  }
  return true;
}

function renderInputs() {
  renderInputList("rr", rrData);
  renderInputList("srtf", srtfData);
}

function renderInputList(type, data) {
  const container = document.getElementById(`${type}-input-list`);
  container.innerHTML = data
    .map(
      (p, i) => `
          <div class="process-row">
            <span>P${i + 1}</span>
            <input class="${type}node" type="number" value="${p.a}" onchange="${type}Data[${i}].a = +this.value" min="0" title="Arrival">
            <input class="${type}node" type="number" value="${p.b}" onchange="${type}Data[${i}].b = +this.value" min="0" title="Burst">
            <button class="btn" style="padding:2px 8px; background-color: red;" onclick="removeProcess('${type}', ${i})">×</button>
          </div>
        `,
    )
    .join("");
}

function addNewProcess(type) {
  const data = type === "rr" ? rrData : srtfData;
  data.push({ a: 0, b: 5 });
  renderInputs();
}

function removeProcess(type, i) {
  const data = type === "rr" ? rrData : srtfData;
  data.splice(i, 1);
  renderInputs();
}

function uiRunRR() {
  if (!isDataValid("rr")) return;
  const q = +document.getElementById("rr-q").value;
  const nodes = rrData.map((d, i) => new NODE(i + 1, d.a, d.b));
  const scheduler = new Round_Robin(q, nodes);
  scheduler.run();
  scheduler.getTimes();
  displayResults("rr", scheduler);
}

function uiRunSRTF() {
  if (!isDataValid("srtf")) return;
  const nodes = srtfData.map((d, i) => new NODE(i + 1, d.a, d.b));
  const scheduler = new SRTF(nodes);
  scheduler.run();
  scheduler.getTimes();
  displayResults("srtf", scheduler);
}

function displayResults(type, scheduler) {
  const area = document.getElementById(`${type}-result-area`);
  const nodes = scheduler.getnodes();
  const lastLog = scheduler.gantt_log[scheduler.gantt_log.length - 1];
  if (!lastLog) return;
  const totalTime = lastLog.end;
  let html = `<div class="gantt-container">
  <div class="gantt-bar">
    ${scheduler.gantt_log
      .map(
        (entry) => `
      <div class="gantt-block" style="width: ${((entry.end - entry.start) / totalTime) * 100}%; background: ${entry.color}; position: relative;" title="P${entry.id} (${entry.start}-${entry.end})">
        P${entry.id}
        <span style="position: absolute; bottom: 2px; left: 3px; font-size: 10px;">${entry.start}</span>
        <span style="position: absolute; bottom: 2px; right: 3px; font-size: 10px;">${entry.end}</span>
      </div>
    `,
      )
      .join("")}
  </div>
</div>`;

  html += `<table>
          <tr><th>PID</th><th>AT</th><th>BT</th><th>CT</th><th>TT</th><th>WT</th><th>RT</th></tr>
          ${nodes
            .map(
              (n) => `
            <tr>
              <td>P${n.p_id}</td><td>${n.arrival_time}</td><td>${n.burst_time}</td>
              <td>${n.completion_time}</td><td>${n.turnaround_time}</td>
              <td>${n.waiting_time}</td><td>${n.response_time}</td>
            </tr>
          `,
            )
            .join("")}
        </table>`;

  html += `<div class="stats">
          <div class="stat-card"><span class="stat-val">${scheduler.avg_t_t().toFixed(2)}</span>Avg TT</div>
          <div class="stat-card"><span class="stat-val">${scheduler.avg_w_t().toFixed(2)}</span>Avg WT</div>
          <div class="stat-card"><span class="stat-val">${scheduler.avg_r_t().toFixed(2)}</span>Avg RT</div>
        </div>`;

  area.innerHTML = html;
}
function uiRunBoth() {
  uiRunRR();
  uiRunSRTF();
}
renderInputs();
