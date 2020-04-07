import { Intersection } from "./intersection";
import { DefaultMap } from "./defaultMap";
import { File } from "./file";
import { TokenizedFile } from "./tokenizedFile";
import { Match } from "./match";
import { Selection } from "./selection";
import { Range } from "./range";
import { Options } from "./options";

export interface ScoredIntersection {
  intersection: Intersection;
  overlap: number;
  similarity: number;
}

export class Analysis {

  // to keep track of which two files match (and not have two times the same
  // Intersection but in different order), we use a nested map where we use
  // the two keys in lexicographical order
  private intersectionMap:
    DefaultMap<TokenizedFile, Map<TokenizedFile, Intersection>>
    = new DefaultMap(() => new Map())

  constructor(
    public readonly options: Options
  ) {}

  public addMatch(
    left: TokenizedFile,
    right: TokenizedFile,
    match: Match<Selection>
  ): void {

    const [first, second] = [left, right].sort(File.compare);
    let intersection = this.intersectionMap.get(first).get(second);
    if (!intersection) {
      intersection = new Intersection(left, right);
      this.intersectionMap.get(first).set(second, intersection);
    }

    intersection.addMatch(match);
  }

  public *intersectionIterator(): IterableIterator<Intersection> {
    for (const map of this.intersectionMap.values()) {
      yield *map.values();
    }
  }

  public intersections(): Array<Intersection> {
    return Array.of(...this.intersectionIterator());
  }

  public scoredIntersections(): Array<ScoredIntersection> {
    const k = this.options.kmerLength;
    return this
      .intersections()
      .map(intersection => {
        const overlap =
          Range.totalCovered(intersection.matches.map(m => m.leftKmers));
        const leftTotal = intersection.leftFile.totalKmers(k);
        const rightTotal = intersection.rightFile.totalKmers(k);
        return {
          intersection,
          overlap,
          similarity: 2*overlap / (leftTotal + rightTotal)
        }})
      .sort((a, b) => a.overlap - b.overlap);
  }
}
