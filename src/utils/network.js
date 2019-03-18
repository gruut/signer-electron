const path = require('path')
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')

const SIGNER_PROTO_PATH = path.resolve(__dirname, '/../protos/signer.proto')
const LOAD_ARGS = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
}

// Load the protobuf
var proto = grpc.loadPackageDefinition(
  protoLoader.loadSync(SIGNER_PROTO_PATH, LOAD_ARGS)
)

let client = new proto.grpc_signer.GruutSignerService(
  '0.0.0.0:50051',
  grpc.credentials.createInsecure()
)
