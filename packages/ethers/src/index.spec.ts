import assert from "assert";
import { type Request, type Response, fixtures } from "rpch-common";
import { RPChProvider } from ".";
import nock from "nock";

const TIMEOUT = 10e3;
const DISCOVERY_PLATFORM_API_ENDPOINT = "http://discovery_platform";
const ENTRY_NODE_API_ENDPOINT = "http://entry_node";
const ENTRY_NODE_API_TOKEN = "12345";
const ENTRY_NODE_PEER_ID = fixtures.PEER_ID_A;
const EXIT_NODE_PEER_ID = fixtures.PEER_ID_B;

const getMockedResponse = (request: Request): Response => {
  const rpcId: number = JSON.parse(request.body)["id"];
  let body: string = "";

  if (request.body.includes("eth_chainId")) {
    body = `{"jsonrpc": "2.0","result": "0x01","id": ${rpcId}}`;
  } else if (request.body.includes("eth_blockNumber")) {
    body = `{"jsonrpc": "2.0","result": "0x17f88c8","id": ${rpcId}}`;
  }

  return request.createResponse(body);
};

describe("test index.ts", function () {
  // pseudo responses from entry node
  nock(ENTRY_NODE_API_ENDPOINT).persist().post(/.*/).reply(202, "someresponse");

  const provider = new RPChProvider(
    ENTRY_NODE_API_ENDPOINT,
    ENTRY_NODE_PEER_ID,
    {
      timeout: TIMEOUT,
      discoveryPlatformApiEndpoint: DISCOVERY_PLATFORM_API_ENDPOINT,
      entryNodeApiEndpoint: ENTRY_NODE_API_ENDPOINT,
      entryNodeApiToken: ENTRY_NODE_API_TOKEN,
      exitNodePeerId: EXIT_NODE_PEER_ID,
    }
  );

  // hook to emulate responses from the exit node
  const originalSendRequest = provider.sdk.sendRequest.bind(provider.sdk);
  provider.sdk.sendRequest = async (req: Request): Promise<Response> => {
    setTimeout(() => {
      const response = getMockedResponse(req);
      provider.sdk.onResponseFromSegments(response);
    }, 100);
    return originalSendRequest(req);
  };

  it("should get chain id", async function () {
    const network = await provider.getNetwork();
    assert.equal(network.chainId, 1);
  });

  it("should get block number", async function () {
    const blockNumber = await provider.getBlockNumber();
    assert.equal(blockNumber, 25135304);
  });
});