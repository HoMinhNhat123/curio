import React from "react";
import { renderHook, act, render } from '@testing-library/react';


/**Heavy depenecencies mocking and will change as the test file gets bigger*/

/**reactFlow mock 
 * comment here 
 * 
 */
let mockInitialNode: any[] = [];
let mockEdges: any[] = [];
jest.mock('reactflow', () => {
  const actualReact = require('react');
  return {
    useNodesState: () => {
      const [nodes, setNodes] = actualReact.useState(mockInitialNode);
      return [nodes, setNodes, jest.fn()]
    },
    useEdgesState: () => {
      const [edges, setEdges] = actualReact.useState(mockEdges);
      return [edges, setEdges, jest.fn()];
    },
    useReactFlow: () => ({
      getNodes: () => mockInitialNode,
      getEdges: () => mockEdges,
      getNode: () => undefined
    }),
    addEdge: jest.fn((edge, edges) => [...edges, edge]),
    getOutgoers: () => [],
    MarkerType: { ArrowClosed: 'arrowclosed' },
  }
});

jest.mock('../../providers/ToastProvider', () => ({
  useToastContext: () => ({ showToast: jest.fn() })
}));

jest.mock('../../providers/CollaborationProvider', () => ({
  useCollab: () => ({
    enabled: false,
    onRemote: jest.fn(() => jest.fn()),
    broadcastNodeAdded: jest.fn(),
    broadcastNodeRemoved: jest.fn(),
    broadcastEdgeAdded: jest.fn(),
    broadcastEdgeRemoved: jest.fn()
  }),
}));

jest.mock('../../ConnectionValidator', () => ({
  ConnectionValidator: {}
}));


jest.mock('../../hook/useWorkflowOperations', () => ({
  useWorkflowOperations: () => ({
    markNodeExecuted: jest.fn(),
    markNodeStale: jest.fn(),
    markDirty: jest.fn()
  }),
}));

jest.mock('../../hook/useCode', () => ({
  pythonInterpreter: {},
  jsInterpreter: {},
}));

import FlowProvider, { useFlowContext } from "../../providers/FlowProvider";

//create a html element like </FlowProvider> {children} <FlowProvider>
const wrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement(FlowProvider, null, children)

describe('FlowProviderTest', () => {
  //applyNewOutput takes an { nodeId, output } parameter, finds downstream nodes via edges, and sets their data.input.
  //testing if it actually send output downstream 
  //making a -> b edge, test if b.data.input == a.data.output and b.data.source == a after calling applyNewOutput
  it('testing ApplyNewOutput', () => {
    //create a->b edge
    mockEdges = [{ id: 'a-b', source: 'a', target: 'b', sourceHandle: 'output-0', targetHandle: 'input-0' }]  
    mockInitialNode = [
      { id: 'a', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', position: {x: 100,  y: 0}, data:{} }
    ]

    const { result } = renderHook(() => useFlowContext(), { wrapper }); 
    act(() =>
      result.current.applyNewOutput({ nodeId: 'a', output: "artifact-sample" })
    )

    const nodeB = result.current.nodes.find((node: any) => node.id == 'b');
    expect(nodeB?.data.input).toBe('artifact-sample');
    expect(nodeB?.data.source).toBe('a');
  });
})



