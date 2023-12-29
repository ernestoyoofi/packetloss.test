const optionsChart = {
  maintainAspectRatio: false,
  // plugins: {
  //   legend: {
  //     display: false
  //   }
  // },
  plugins: {
    legend: {
      display: false,
      position: 'bottom',
    },
    title: {
      display: true,
      text: 'Time Of Reciver Permiliseconds'
    }
  },
  elements: {
    line: {
      tension: 0,
      borderWidth: 2,
      borderColor: "rgb(47, 97, 68)",
      fill: "start",
      backgroundColor: "rgb(47, 79, 68)",
    },
    point: {
      radius: 0,
      hitRadius: 9
    },
  },
  scales: {
    x: {
      grid: {
        display: true
      },
      border: {
        dash: [2,4],
      },
      ticks: {
        display: false
      }
    },
    y: {
      grid: {
        display: true
      },
      border: {
        dash: [2,4],
      },
      ticks: {
        display: true
      }
    }
  }
}

function GenerateData(lengths) {
  const a = "abcdef1234567890"
  let toText = ""
  for(let i in [...Array(lengths)]) {
    toText += a.charAt(Math.floor(Math.random()*a.length))
  }
  return toText
}
function StartPacketSend({ urlws, packetlength, looprange, time, message }={}) {
  const wss = new WebSocket(urlws)
  let packetSave = {}
  let getTotalReciver = 0
  let isAvaReciver = true
  const hintLoop = () => {
    let collectTime = 0
    let selectTime = 0
    let looperSocket = null
    let timeoutSend = null
    let clockTime = setInterval(() => {
      selectTime++
      message({type:"time-outs",data: time - selectTime})
    }, 1000)
    timeoutSend = setTimeout(() => {
      isAvaReciver=false
      clearInterval(clockTime)
      clearInterval(looperSocket)
      clearTimeout(timeoutSend)
      message({type:"data-stop"})
      setTimeout(() => {
        wss.close()
      }, 500)
    }, 1000*time)
    looperSocket = setInterval(() => {
      // console.log(collectTime/(1000/looprange), (1000/looprange), time)
      // if(collectTime/(1000/looprange) > time) {
      //   isAvaReciver=false
      //   message({type:"data-stop"})
      //   clearInterval(looperSocket)
      //   setTimeout(() => {
      //     wss.close()
      //   }, 500)
      //   return;
      // }
      collectTime++
      const idpkg = GenerateData(10)
      packetSave[idpkg] = {
        start: new Date().getTime(),
        end: 0,
        range: 0,
      }
      message({type:"data-send",id: idpkg, total: Object.keys(packetSave).length })
      wss.send(JSON.stringify({type:"data-send",id: idpkg,packet: GenerateData(packetlength)}))
    }, looprange)
  }
  wss.onopen = () => {
    message({type:"connection-open"})
    console.log("[WS Connection]: Open")
  }
  wss.onclose = () => {
    message({type:"connection-close"})
    message({
      type:"data-graph",
      data: {
        graph: Object.keys(packetSave).map(a => ({
          id: a,
          lost: packetSave[a].end === 0,
          mcs: packetSave[a].range,
        })),
        totalsend: Object.keys(packetSave).length,
        totalreciver: getTotalReciver
      }
    })
    console.log("[WS Connection]: Close")
  }
  wss.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if(data.type === "data-ready") {
      hintLoop()
    }
    if(data.type === "data-meta" && isAvaReciver) {
      getTotalReciver++
      packetSave[data.id] = {
        start: packetSave[data.id].start,
        end: new Date().getTime(),
        range: new Date().getTime() - packetSave[data.id].start
      }
      message({type:"reciver-data", total: getTotalReciver})
    }
    if(data.type === "data-meta" && !isAvaReciver) {
      return;
    }
    message(data)
  }
}
document.getElementById("submit").addEventListener("click", () => {
  const urlws = document.getElementById("socket").value
  const pcklg = document.getElementById("packetlength").value
  const looprange = document.getElementById("looprange").value
  const time = document.getElementById("time").value
  StartPacketSend({
    urlws: urlws,
    packetlength: Number(pcklg),
    looprange: Number(looprange),
    time: Number(time),
    message: (e) => {
      // document.getElementById("message").innerText += "\n"+JSON.stringify(e)
      if(e.type === "data-send") {
        document.getElementById("send_packet").innerText = `Send ${e.total} packet`
      }
      if(e.type === "reciver-data") {
        document.getElementById("reciver_packet").innerText = `Reciver ${e.total} packet`
      }
      if(e.type === "time-outs") {
        document.getElementById("time_packet").innerText = `${e.data} seconds`
      }
      if(e.type === "data-graph") {
        console.log(e)
        document.getElementById("time_packet").innerText = `${Math.floor((100 * e.data.totalreciver) / e.data.totalsend)}% Packet is success send and ${Math.floor(100 - ((100 * e.data.totalreciver) / e.data.totalsend))}% is packet loss`
        new Chart("canvas-chart",{
          type:"line",
          data: {
            labels: e.data.graph.map(a => "Time Sending"),
            datasets: [
              {
                label: 'Recivers Sending',
                data: e.data.graph.map(a => a.lost? 0:a.mcs),
                borderRadius: 10,
                borderColor: "rgba(0, 94, 255)",
                backgroundColor: "rgba(0, 94, 255, 0.5)",
                fill: true,
                barThickness: 10,
                tension: 0.3,
              }
            ]
          },
          options: optionsChart
        })
      }
    }
  })
})