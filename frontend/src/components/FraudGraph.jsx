import React, { useEffect, useRef, useState } from 'react';
import { getGraph, getTransactions } from '../api';

const NODE_COLORS = {
  payer: '#A78BFA',
  payee: '#4ADE80',
  device: '#55556A',
};
const FLAGGED_COLOR = '#FF4D6A';

export default function FraudGraph() {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeTxns, setNodeTxns] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const data = await getGraph();
        if (cancelled || !svgRef.current) return;
        drawGraph(data);
      } catch (e) {
        console.error(e);
      }
    };
    render();
    const interval = setInterval(render, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (simRef.current) simRef.current.stop();
    };
  }, []);

  const drawGraph = (data) => {
    const d3 = window.d3;
    if (!d3) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 500;

    svg.selectAll('*').remove();
    const g = svg.append('g');

    svg.call(d3.zoom().scaleExtent([0.3, 5]).on('zoom', (event) => g.attr('transform', event.transform)));

    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(30));

    simRef.current = simulation;

    // Edges
    const link = g.append('g')
      .selectAll('line')
      .data(data.edges)
      .join('line')
      .attr('stroke', d => (d.source.flagged && d.target.flagged) ? 'rgba(255,77,106,0.4)' : '#2A2A35')
      .attr('stroke-width', 1.5);

    // Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Pulse ring for flagged
    node.filter(d => d.flagged)
      .append('circle')
      .attr('r', 14)
      .attr('fill', 'none')
      .attr('stroke', FLAGGED_COLOR)
      .attr('stroke-width', 1.5)
      .style('transform-origin', 'center')
      .each(function pulse() {
        d3.select(this)
          .style('opacity', 0.4)
          .style('transform', 'scale(1)')
          .transition().duration(1500)
          .style('opacity', 0)
          .style('transform', 'scale(1.4)')
          .on('end', pulse);
      });

    // Base circle
    node.append('circle')
      .attr('r', d => d.type === 'payer' ? 10 : d.type === 'payee' ? 8 : 6)
      .attr('fill', d => d.flagged ? FLAGGED_COLOR : NODE_COLORS[d.type] || '#55556A')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => handleNodeClick(d));

    // Label
    node.append('text')
      .text(d => d.id.length > 8 ? d.id.slice(0, 8) + '…' : d.id)
      .attr('dy', 22)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-secondary)')
      .style('font-family', 'DM Mono')
      .style('font-size', '10px');

    simulation.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  };

  const handleNodeClick = async (nodeData) => {
    setSelectedNode(nodeData);
    try {
      const txns = await getTransactions();
      setNodeTxns(txns.filter(t => t.payer_id === nodeData.id || t.payee_id === nodeData.id || t.device_id === nodeData.id));
    } catch {
      setNodeTxns([]);
    }
  };

  return (
    <div className="relative w-full h-[500px] bg-[var(--bg-card)] rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-[#0D0D0F] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 space-y-2">
        {[
          { c: NODE_COLORS.payer, l: 'Payer' },
          { c: NODE_COLORS.payee, l: 'Payee' },
          { c: NODE_COLORS.device, l: 'Device' },
          { c: FLAGGED_COLOR, l: 'Flagged' },
        ].map(item => (
          <div key={item.l} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.c }} />
            <span className="caption">{item.l}</span>
          </div>
        ))}
      </div>

      {/* Side Panel */}
      {selectedNode && (
        <div className="absolute top-0 right-0 w-[280px] h-full bg-[var(--bg-card)] border-l border-[var(--border)] shadow-2xl flex flex-col animate-row-enter">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[#0D0D0F]">
            <div>
              <h3 className="card-title truncate max-w-[200px]">{selectedNode.id}</h3>
              <p className="caption capitalize">{selectedNode.type}</p>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-[var(--text-secondary)] hover:text-white">✕</button>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Status</span>
                {selectedNode.flagged ? <span className="text-[var(--danger)] font-bold">FLAGGED</span> : <span className="text-[var(--accent-green)] font-bold">SAFE</span>}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Linked Nodes</span>
                <span className="mono">{selectedNode.links ? selectedNode.links.length : 0}</span>
              </div>
            </div>

            <h4 className="caption uppercase tracking-wider mb-3">Transactions</h4>
            <div className="space-y-2">
              {nodeTxns.length === 0 ? <p className="caption">No history.</p> : 
                nodeTxns.map((t, i) => (
                  <div key={i} className="p-2.5 bg-[#0D0D0F] border border-[var(--border)] rounded-[var(--radius-sm)] flex justify-between items-center">
                    <span className="mono text-xs">{t.txn_id?.slice(0,8)}</span>
                    <span className="mono text-xs text-[var(--accent-purple)]">₹{t.amount}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
