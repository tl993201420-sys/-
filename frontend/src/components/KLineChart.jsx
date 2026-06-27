import { useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'

// K线图：买入点(绿色↑) / 卖出点(红色↓) / 止损价(红虚线) / 目标价(绿虚线)
// 注意：A股习惯涨红跌绿，故 K 线 upColor=红, downColor=绿
export default function KLineChart({ data, entry, exit, stopLoss, targetPrice, height = 380 }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#475569' },
      grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
      width: containerRef.current.clientWidth,
      height,
      rightPriceScale: { borderColor: '#e2e8f0' },
      timeScale: { borderColor: '#e2e8f0', timeVisible: false },
      crosshair: { mode: 0 },
    })

    const candle = chart.addCandlestickSeries({
      upColor: '#e11d48', downColor: '#16a34a',
      borderUpColor: '#e11d48', borderDownColor: '#16a34a',
      wickUpColor: '#e11d48', wickDownColor: '#16a34a',
    })
    candle.setData(
      data.map((d) => ({
        time: d.date,
        open: d.open, high: d.high, low: d.low, close: d.close,
      }))
    )

    // 买入/卖出标记
    const markers = []
    if (entry?.date) {
      markers.push({
        time: entry.date, position: 'belowBar', color: '#16a34a',
        shape: 'arrowUp', text: `买入 ${entry.price ?? ''}`,
      })
    }
    if (exit?.date) {
      markers.push({
        time: exit.date, position: 'aboveBar', color: '#e11d48',
        shape: 'arrowDown', text: `卖出 ${exit.price ?? ''}`,
      })
    }
    if (markers.length) candle.setMarkers(markers.sort((a, b) => (a.time > b.time ? 1 : -1)))

    // 止损/目标价水平线
    if (stopLoss) {
      candle.createPriceLine({
        price: stopLoss, color: '#e11d48', lineWidth: 1, lineStyle: 2,
        axisLabelVisible: true, title: '止损',
      })
    }
    if (targetPrice) {
      candle.createPriceLine({
        price: targetPrice, color: '#16a34a', lineWidth: 1, lineStyle: 2,
        axisLabelVisible: true, title: '目标',
      })
    }

    chart.timeScale().fitContent()

    const onResize = () => chart.applyOptions({ width: containerRef.current.clientWidth })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.remove()
    }
  }, [data, entry, exit, stopLoss, targetPrice, height])

  return <div ref={containerRef} className="w-full" />
}
