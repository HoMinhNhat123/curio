import React from "react";
import { renderHook, act } from '@testing-library/react';
import { NodeType, ResolutionType } from '../../constants';


/**Heavy depenecencies mocking and will change as the test file gets bigger*/

/**reactFlow mock 
 * toDo: comment here 
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
      getNode: (id: any) => mockInitialNode.find((n: any) => n.id == id)
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
  ConnectionValidator: {
    checkBoxCompatibility: (outNode: any, inNode: any) => true,
  },
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
  describe('testing onConnect function', () => {
    it('onConnect initializes Merge Flow source and input arrays', () => {
      mockInitialNode = [
        { id: 'a', type: '__curioUniversalNode', position: { x: 0, y: 0 }, data: {nodeId: 'a', nodeType: 'curio.builtin/computation-analysis@1'} },
        { id: 'b', type: '__curioUniversalNode', position: { x: 0, y: 30 }, data: {nodeId: 'b', nodeType: 'curio.builtin/computation-analysis@1'} },
        { id: 'merge', type: '__curioUniversalNode', position: { x: 100, y: 0 }, data: { nodeId: 'merge', NodeType: NodeType.MERGE_FLOW, } },
      ];

      mockEdges = [];

      const { result } = renderHook(() => useFlowContext(), { wrapper });

      act(() => {
        result.current.onConnect({
          source: 'a',
          target: 'merge',
          sourceHandle: 'out',
          targetHandle: 'in_0',
        } as any);
      });

      const mergeNode = result.current.nodes.find((node: any) => node.id === 'merge');

      expect(mergeNode?.data.source?.[0]).toBe('a');

      // act(() => {
      //   result.current.onConnect({
      //     source: 'b',
      //     target: 'merge',
      //     sourceHandle: 'out',
      //     targetHandle: 'in_1',
      //   } as any);
      // });

      // expect(mergeNode?.data.source?.[1]).toBe('b');
      // console.log(mergeNode?.data);
    });
  })

  //applyNewOutput takes an { nodeId, output } parameter, finds downstream nodes via edges, and sets their data.input.
  describe('testing ApplyNewOutput function', () => {
    //refresh the nodes and edges after each test
    beforeEach(() => {
      mockInitialNode = [];   // keys for each node: {id position data}
      mockEdges = [];         // keys for each edge: {id source target sourceHandle targetHandle}
    })
    //testing if it actually send output downstream
    //making a -> b edge, test if b.data.input == a.data.output and b.data.source == a after calling applyNewOutput
    //also testing if the 'b' data is overwritten
    //standalone c node shouldn't have receive any downstream input
    it('ApplyNewOutput send data downstream', () => {
      //create a->b edge
      mockEdges = [{ id: 'a-b', source: 'a', target: 'b', sourceHandle: 'out', targetHandle: 'input-0' }]
      //create a, b, c nodes
      mockInitialNode = [
        { id: 'a', position: { x: 0, y: 0 }, data: {} },
        { id: 'b', position: { x: 100, y: 0 }, data: { label: 'python computation', source: 'intial source', input: 'initial input'} },
        { id: 'c', position: {x: 0, y: 100}, data: {nodeType: 'javascript'}}
      ]

      const { result } = renderHook(() => useFlowContext(), { wrapper });
      act(() =>
        result.current.applyNewOutput({ nodeId: 'a', output: "artifact-sample" })
      )

      const nodeA = result.current.nodes.find((node: any) => node.id == 'a');
      const nodeB = result.current.nodes.find((node: any) => node.id == 'b');
      const nodeC = result.current.nodes.find((node: any) => node.id == 'c')

      expect(nodeA?.data.input).toBeUndefined();
      
      //nodeA send data downstream to nodeB
      expect(nodeB?.data.input).toBe('artifact-sample');
      expect(nodeB?.data.source).toBe('a');
      expect(nodeB?.data.label).toBe('python computation');

      expect(nodeC?.data.input).toBeUndefined();
      expect(nodeC?.data.source).toBeUndefined();
      expect(nodeC?.data.nodeType).toBe('javascript');
    });
    //a->b edge and a->c edge and a standalone d node
    //testing if when a send data downstream to correct nodes (b and c)
    it('ApplyNewOutput send data to the correct nodes', () => {
      mockEdges = [
        { id: 'a-b', source: 'a', target: 'b', sourceHandle: 'out', targetHandle: 'input-0' },
        { id: 'a-c', source: 'a', target: 'c', sourceHandle: 'output-1', targetHandle: 'input-1'}            
      ]
      mockInitialNode = [
        { id: 'a', position: { x: 0, y: 0 }, data: {} },
        { id: 'b', position: { x: 100, y: 0 }, data: { label: 'python computation', nodeType: 'python' } },
        { id: 'c', position: { x: 0, y: 100 }, data: { nodeType: 'javascript' } },
        { id: 'd', position: {x: 100, y: 100}, data: {nodeType: 'C++'}}
      ]

      const { result } = renderHook(() => useFlowContext(), { wrapper });
      act(() => 
        result.current.applyNewOutput({ nodeId: 'a', output: "artifact sample"})
      )

      const nodeB = result.current.nodes.find((node: any) => node.id == 'b');
      const nodeC = result.current.nodes.find((node: any) => node.id == 'c');
      const nodeD = result.current.nodes.find((node: any) => node.id == 'd');

      expect(nodeB?.data.input).toBe("artifact sample");
      expect(nodeB?.data.source).toBe("a");
      expect(nodeB?.data.label).toBe("python computation");
      expect(nodeB?.data.nodeType).toBe("python");

      expect(nodeC?.data.input).toBe("artifact sample");
      expect(nodeC?.data.source).toBe("a");
      expect(nodeC?.data.nodeType).toBe("javascript");

      expect(nodeD?.data.input).toBeUndefined();
      expect(nodeD?.data.source).toBeUndefined();
      expect(nodeD?.data.nodeType).toBe('C++');
    })
    //no downstream edges
    it('ApplyNewOutput node isnt connected to any node', () => {
      mockInitialNode = [
        { id: 'a', position: { x: 0, y: 0 }, data: {} },
        { id: 'b', position: { x: 100, y: 0 }, data: { label: 'python computation', nodeType: 'python' } },
      ];
      mockEdges = [];

      const { result } = renderHook(() => useFlowContext(), { wrapper });
      act(() => 
        result.current.applyNewOutput({ nodeId: 'a', output: "artifact sample"})
      )
      
      const nodeA = result.current.nodes.find((node: any) => node.id == 'a');
      const nodeB = result.current.nodes.find((node: any) => node.id == 'b');
      
      expect(nodeB?.data.input).toBeUndefined();
      expect(nodeB?.data.source).toBeUndefined();
      expect(nodeB?.data.nodeType).toBe('python');

      expect(nodeA?.data.input).toBeUndefined();
    })

    //the data beng sent downstream is undefined
    it('ApplyNewOutput with undefined output', () => {
      mockInitialNode = [
        { id: 'a', position: { x: 0, y: 0 }, data: {} },
        { id: 'b', position: { x: 100, y: 0 }, data: { label: 'python computation', nodeType: 'python' } },
      ];
      mockEdges = [{ id: 'a-b', source: 'a', target: 'b', sourceHandle: 'output-0', targetHandle: 'input-0' }];

      const { result } = renderHook(() => useFlowContext(), { wrapper });
      act(() => {
        result.current.applyNewOutput({ nodeId: 'a', output: undefined as any })
      })

      const nodeB = result.current.nodes.find((node: any) => node.id == 'b');
  
      expect(nodeB?.data.source).toBe('');
      expect(nodeB?.data.input).toBe('');
    })

    //mergeFlow node will receive multiple input
    //a -> mergeNode   and   b -> mergeNode
    //expected: mergeNode.data have both data from 'a' node and 'b' node
    //geuinely don't know if the data.source and data.input should be initlaized before applyNewOutput?
    //problem with onConnect have to check it 
    it('applyNewOutput updates Merge Flow when merge node uses real Curio node shape', () => {
      mockInitialNode = [
        {
          id: 'a', type: '__curioUniversalNode', position: { x: 0, y: 0 },
          data: {
            nodeId: 'a',
            nodeType: 'curio.builtin/computation-analysis@1',
          },
        },
        {
          id: 'b', type: '__curioUniversalNode', position: { x: 0, y: 100 },
          data: {
            nodeId: 'b',
            nodeType: 'curio.builtin/computation-analysis@1',
          },
        },
        {
          id: 'merge', type: '__curioUniversalNode', position: { x: 300, y: 50 },
          data: {
            nodeId: 'merge',
            nodeType: NodeType.MERGE_FLOW,

            // This is the important initialized Merge Flow state.
          },
        },
      ];

      mockEdges = [
        { id: 'a-merge', source: 'a', target: 'merge',sourceHandle: 'out',targetHandle: 'in_0'},
        { id: 'b-merge', source: 'b', target: 'merge', sourceHandle: 'out', targetHandle: 'in_1'}
      ];

      const { result } = renderHook(() => useFlowContext(), { wrapper });

      act(() => {
        result.current.applyNewOutput({
          nodeId: 'a',
          output: "nodeAOutput",
        });
      });
      
      act(() => {
        result.current.applyNewOutput({
          nodeId: 'b',
          output: "nodeBOutput",
        });
      });

      const mergeNode = result.current.nodes.find((node: any) => node.id === 'merge');

      expect(mergeNode?.data.input[0]).toEqual("nodeAOutput");
      expect(mergeNode?.data.input[1]).toBe('nodeBOutput');
      expect(mergeNode?.data.source).toEqual(['a', 'b']);
    });
  })
})



