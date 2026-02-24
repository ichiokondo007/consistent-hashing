import murmurhash from 'murmurhash';
// murmurhas:アバランシェ効果より、入力が少し変わるだけで出力が大きく変わるため、均一な分布を期待

class CanvasRouter {
  // ハッシュリング（座標 -> IPアドレス）
  private ring = new Map<number, string>();
  // ソートされた座標リスト
  private sortedKeys: number[] = [];
  // 1台あたりの仮想ノード数（3台なら100〜200で十分均一になります）
  private readonly vNodeCount: number;

  constructor(nodes: string[], vNodeCount: number = 300) {
    this.vNodeCount = vNodeCount;
    this.initializeRing(nodes);
  }

  private initializeRing(nodes: string[]) {
    nodes.forEach(node => {
      for (let i = 0; i < this.vNodeCount; i++) {
        // IP + 枝番でハッシュ化し、座標を決定
        const hash = murmurhash.v3(`${node}#${i}`);
        this.ring.set(hash, node);
        this.sortedKeys.push(hash);
      }
    });
    // 数値順にソート（これがリングの形を成す）
    this.sortedKeys.sort((a, b) => a - b);
  }

  /**
   * CanvasIDを元に、接続先のIPアドレスを特定する
   */
  public route(canvasId: string): string {
    if (this.sortedKeys.length === 0) throw new Error("No nodes available");

    // CanvasIDをハッシュ化
    const hash = murmurhash.v3(canvasId);

    // 1. リング上を「時計回り」に探索
    // binary search (二分探索) で高速に見つける
    let index = this.binarySearch(hash);

    // 2. 見つかったインデックスのハッシュ値から、MapでIPを取得
    // indexが配列外（最後より大きい）ならリングの先頭に戻る
    const targetHash = this.sortedKeys[index % this.sortedKeys.length]!;
    return this.ring.get(targetHash)!;
  }

  private binarySearch(hash: number): number {
    let low = 0;
    let high = this.sortedKeys.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.sortedKeys[mid]! === hash) return mid;
      if (this.sortedKeys[mid]! < hash) low = mid + 1;
      else high = mid - 1;
    }
    return low; // 見つからない場合、次に大きい要素のインデックスを返す
  }
}

// --- 検証用実行コード ---

const ecsNodes = ['192.168.0.1', '192.168.0.2', '192.168.0.3','192.168.0.4'];
const router = new CanvasRouter(ecsNodes);

const testCanvasIds = [
  'aaaaabbbbcccccccccccccccc',
  'uuid-canvas-111',
  'uuid-canvas-222',
  'uuid-canvas-333',
  'uuid-canvas-111',
  'uuid-canvas-111',
  'uuid-canvas-444',
  'uuid-canvas-222',
  'uuid-canvas-333',
  'aaaaabbbbcccccccccccccccc',
  'uuid-canvas-999',
  'aaaaabbbbcccccccccccccccz',
];

console.log("--- Routing Result ---");
testCanvasIds.forEach(id => {
  console.log(`Canvas [${id}] -> Server [${router.route(id)}]`);
});
