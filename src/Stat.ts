import {
  AnyRequestMethodName,
  RequestIdProp,
  RequestProps,
} from '@vkontakte/vk-bridge/dist/types/src/types/bridge';

export interface IStat {
  max: number;
  avg: number;
  sum: number;
  count: number;
}

export class Stat {
  private readonly begins: Map<string, number>;
  private readonly data: Map<string, IStat>;

  constructor() {
    this.begins = new Map<string, number>();
    this.data = new Map<string, IStat>();
  }

  time() {
    if (window.performance && window.performance.now) {
      return window.performance.now();
    }
    return Date.now();
  }

  begin<K extends AnyRequestMethodName>(method: K, props?: RequestProps<K> & RequestIdProp, contextId?: string) {
    this.begins.set(this.slug(method, props, contextId), this.time());
  }

  end<K extends AnyRequestMethodName>(method: K, props?: RequestProps<K> & RequestIdProp, contextId?: string, success?: boolean) {
    const slug = this.slug(method, props, contextId);
    const end = this.time();
    const start = this.begins.get(slug);
    if (!start) {return;}
    this.begins.delete(slug);
    const duration = end - start;
    const [statName] = slug.split('_');
    if (this.begins.size > 100 || this.data.size > 100) {
      this.flush();
    }
    this.record(statName, duration);
    if (success) {
      this.record(`${statName}_success`, duration);
    } else {
      this.record(`${statName}_failed`, duration);
    }
  }

  /**
   * VKWebAppCallAPIMethod_<randomId>
   */
  slug<K extends AnyRequestMethodName>(method: K, props?: RequestProps<K> & RequestIdProp, contextId?: string): string {
    if (method === 'VKWebAppCallAPIMethod' && props) {
      return `${(props as any).method || method}_${contextId || ''}`;
    }
    return `${method}_${contextId || ''}`;
  }

  record(statName: string, duration: number) {
    const prev = this.data.get(statName) || { max: 0, avg: 0, count: 0, sum: 0 };
    prev.count++;
    prev.sum += duration;
    prev.avg = prev.sum / prev.count;
    prev.max = Math.max(prev.max, duration);
    this.data.set(statName, prev);
  }

  flush() {
    this.data.clear();
    this.begins.clear();
  }

  toPlainObject() {
    const data: Record<string, IStat> = {};
    this.data.forEach((value, key) => {
      data[key] = value;
    });
    return data;
  }
}

export const defaultStat = new Stat();
