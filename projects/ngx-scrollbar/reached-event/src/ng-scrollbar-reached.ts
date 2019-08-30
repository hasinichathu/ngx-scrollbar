import { Directive, Optional, Input, Output, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Directionality } from '@angular/cdk/bidi';
import { getRtlScrollAxisType, RtlScrollAxisType } from '@angular/cdk/platform';
import { Observable, Subject, Subscription, Observer } from 'rxjs';
import { filter, map, tap, distinctUntilChanged } from 'rxjs/operators';
import { NgScrollbar } from 'ngx-scrollbar';
// Uncomment the following line in development mode
// import { NgScrollbar } from '../../src/public-api';

class ReachedFunctions {
  static isReachedTop(offset: number, e: any): boolean {
    return ReachedFunctions.reached(-e.target.scrollTop, 0, offset);
  }

  static isReachedBottom(offset: number, e: any): boolean {
    return ReachedFunctions.reached(e.target.scrollTop + e.target.clientHeight, e.target.scrollHeight, offset);
  }

  static isReachedStart(offset: number, e: any, rtl: boolean): boolean {
    if (rtl) {
      if (getRtlScrollAxisType() === RtlScrollAxisType.NEGATED) {
        return ReachedFunctions.reached(e.target.scrollLeft, 0, offset);
      }
      if (getRtlScrollAxisType() === RtlScrollAxisType.INVERTED) {
        return ReachedFunctions.reached(-e.target.scrollLeft, 0, offset);
      }
      return ReachedFunctions.reached(e.target.scrollLeft + e.target.clientWidth, e.target.scrollWidth, offset);
    }
    return ReachedFunctions.reached(-e.target.scrollLeft, 0, offset);
  }

  static isReachedEnd(offset: number, e: any, rtl: boolean): boolean {
    if (rtl) {
      if (getRtlScrollAxisType() === RtlScrollAxisType.NEGATED) {
        return ReachedFunctions.reached(-(e.target.scrollLeft - e.target.clientWidth), e.target.scrollWidth, offset);
      }
      if (getRtlScrollAxisType() === RtlScrollAxisType.INVERTED) {
        return ReachedFunctions.reached(-(e.target.scrollLeft + e.target.clientWidth), e.target.scrollWidth, offset);
      }
      return ReachedFunctions.reached(-e.target.scrollLeft, 0, offset);
    }
    return ReachedFunctions.reached(e.target.scrollLeft + e.target.clientWidth, e.target.scrollWidth, offset);
  }

  static reached(currPosition: number, targetPosition: number, offset: number): boolean {
    return currPosition >= targetPosition - offset;
  }
}

abstract class ScrollReached implements OnDestroy {

  /** offset: Reached offset value in px */
  @Input('reachedOffset') offset = 0;

  /**
   * Stream that emits scroll event when `NgScrollbar.scrolled` is initialized.
   *
   * **NOTE:** This subject is used to hold the place of `NgScrollbar.scrolled` when it's not initialized yet
   */
  protected scrollEvent = new Subject<any>();

  /** subscription: Scrolled event subscription, used to unsubscribe from the event on destroy */
  protected subscription = Subscription.EMPTY;

  /** A stream used to assign the reached output */
  protected reachedEvent = new Observable((observer: Observer<any>) =>
    this.scrollReached().subscribe(_ =>
      Promise.resolve().then(() => this.zone.run(() => observer.next(_)))));

  protected constructor(protected scrollbar: NgScrollbar, protected zone: NgZone) {
    if (!scrollbar) {
      throw new Error('[NgScrollbarReached Directive]: Host element must be an NgScrollbar component.');
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  protected scrollReached(): Observable<any> {
    // current event
    let currEvent: any;

    return this.scrollEvent.pipe(
      tap((e) => currEvent = e),
      // Check if it scroll has reached
      map((e) => this.isReached(this.offset, e)),
      // Distinct until reached value has changed
      distinctUntilChanged(),
      // Emit only if reached is true
      filter((reached: boolean) => reached),
      // Return scroll event
      map(() => currEvent)
    );
  }

  protected abstract isReached(offset: number, e?: any): boolean;
}

abstract class VerticalScrollReached extends ScrollReached implements OnInit {
  protected constructor(@Optional() protected scrollbar: NgScrollbar, protected zone: NgZone) {
    super(scrollbar, zone);
  }

  ngOnInit() {
    this.subscription = this.scrollbar.verticalScrolled.subscribe(this.scrollEvent);
  }
}

abstract class HorizontalScrollReached extends ScrollReached implements OnInit {
  protected constructor(@Optional() protected scrollbar: NgScrollbar, protected zone: NgZone) {
    super(scrollbar, zone);
  }

  ngOnInit() {
    this.subscription = this.scrollbar.horizontalScrolled.subscribe(this.scrollEvent);
  }
}

@Directive({
  selector: '[reachedTop], [reached-top]',
})
export class NgScrollbarReachedTop extends VerticalScrollReached implements OnInit {

  /** Stream that emits when scroll has reached the top */
  @Output() reachedTop: Observable<any> = this.reachedEvent;

  constructor(@Optional() protected scrollbar: NgScrollbar, protected zone: NgZone) {
    super(scrollbar, zone);
  }

  ngOnInit() {
    super.ngOnInit();
  }

  /**
   * Check if scroll has reached the top (vertically)
   * @param offset Scroll offset
   * @param e Scroll event
   */
  protected isReached(offset: number, e: any): boolean {
    return ReachedFunctions.isReachedTop(offset, e);
  }
}

@Directive({
  selector: '[reachedBottom], [reached-bottom]',
})
export class NgScrollbarReachedBottom extends VerticalScrollReached implements OnInit {

  /** Stream that emits when scroll has reached the bottom */
  @Output() reachedBottom: Observable<any> = this.reachedEvent;

  constructor(@Optional() protected scrollbar: NgScrollbar, protected zone: NgZone) {
    super(scrollbar, zone);
  }

  ngOnInit() {
    super.ngOnInit();
  }

  /**
   * Check if scroll has reached the bottom (vertically)
   * @param offset Scroll offset
   * @param e Scroll event
   */
  protected isReached(offset: number, e: any): boolean {
    return ReachedFunctions.isReachedBottom(offset, e);
  }
}

@Directive({
  selector: '[reachedStart], [reached-start]',
})
export class NgScrollbarReachedStart extends HorizontalScrollReached implements OnInit {

  /** Stream that emits when scroll has reached the start */
  @Output() reachedStart: Observable<any> = this.reachedEvent;

  constructor(@Optional() protected scrollbar: NgScrollbar, protected zone: NgZone, private dir: Directionality) {
    super(scrollbar, zone);
  }

  ngOnInit() {
    super.ngOnInit();
  }

  /**
   * Check if scroll has reached the start (horizontally)
   * @param offset Scroll offset
   * @param e Scroll event
   */
  protected isReached(offset: number, e: any): boolean {
    return ReachedFunctions.isReachedStart(offset, e, this.dir.value === 'rtl');
  }
}

@Directive({
  selector: '[reachedEnd], [reached-end]',
})
export class NgScrollbarReachedEnd extends HorizontalScrollReached implements OnInit {

  /** Stream that emits when scroll has reached the end */
  @Output() reachedEnd: Observable<any> = this.reachedEvent;

  constructor(@Optional() protected scrollbar: NgScrollbar, protected zone: NgZone, private dir: Directionality) {
    super(scrollbar, zone);
  }

  ngOnInit() {
    super.ngOnInit();
  }

  /**
   * Check if scroll has reached the end (horizontally)
   * @param offset Scroll offset
   * @param e Scroll event
   */
  protected isReached(offset: number, e: any): boolean {
    return ReachedFunctions.isReachedEnd(offset, e, this.dir.value === 'rtl');
  }
}
