import isNumber from 'lodash/isNumber'
import filter from 'lodash/filter'
import omit from 'lodash/omit'
import {
    radiansToDegrees,
    absoluteAngleDegrees,
    degreesToRadians,
    positionFromAngle,
} from '@nivo/core'
import { defaultProps } from './props'
import {
    AnnotationSpec,
    isCircleAnnotation,
    isRectAnnotation,
    AnnotationPositionGetter,
    AnnotationDimensionsGetter,
    BoundAnnotation,
    AnnotationMatcher,
    AnnotationInstructions,
} from './types'

export const bindAnnotations = <
    Datum = {
        x: number
        y: number
    }
>({
    data,
    annotations,
    getPosition,
    getDimensions,
}: {
    data: Datum[]
    annotations: AnnotationMatcher<Datum>[]
    getPosition: AnnotationPositionGetter<Datum>
    getDimensions: AnnotationDimensionsGetter<Datum>
}): BoundAnnotation<Datum>[] =>
    annotations.reduce((acc: BoundAnnotation<Datum>[], annotation) => {
        filter<Datum>(data, annotation.match).forEach(datum => {
            const position = getPosition(datum)
            const dimensions = getDimensions(datum, annotation.offset || 0)

            acc.push({
                ...omit(annotation, ['match', 'offset']),
                ...position,
                ...dimensions,
                size: annotation.size || dimensions.size,
                datum,
            })
        })

        return acc
    }, [])

export const getLinkAngle = (
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
) => {
    const angle = Math.atan2(targetY - sourceY, targetX - sourceX)

    return absoluteAngleDegrees(radiansToDegrees(angle))
}

export const computeAnnotation = <Datum>(
    annotation: AnnotationSpec<Datum>
): AnnotationInstructions => {
    const {
        x,
        y,
        noteX,
        noteY,
        noteWidth = defaultProps.noteWidth,
        noteTextOffset = defaultProps.noteTextOffset,
    } = annotation

    let computedNoteX: number
    let computedNoteY: number

    if (isNumber(noteX)) {
        computedNoteX = x + noteX
    } else if (noteX.abs !== undefined) {
        computedNoteX = noteX.abs
    } else {
        throw new Error(`noteX should be either a number or an object containing an 'abs' property`)
    }

    if (isNumber(noteY)) {
        computedNoteY = y + noteY
    } else if (noteY.abs !== undefined) {
        computedNoteY = noteY.abs
    } else {
        throw new Error(`noteY should be either a number or an object containing an 'abs' property`)
    }

    let computedX = x
    let computedY = y

    const angle = getLinkAngle(x, y, computedNoteX, computedNoteY)

    if (isCircleAnnotation<Datum>(annotation)) {
        const position = positionFromAngle(degreesToRadians(angle), annotation.size / 2)
        computedX += position.x
        computedY += position.y
    }

    if (isRectAnnotation<Datum>(annotation)) {
        const eighth = Math.round((angle + 90) / 45) % 8
        if (eighth === 0) {
            computedY -= annotation.height / 2
        }
        if (eighth === 1) {
            computedX += annotation.width / 2
            computedY -= annotation.height / 2
        }
        if (eighth === 2) {
            computedX += annotation.width / 2
        }
        if (eighth === 3) {
            computedX += annotation.width / 2
            computedY += annotation.height / 2
        }
        if (eighth === 4) {
            computedY += annotation.height / 2
        }
        if (eighth === 5) {
            computedX -= annotation.width / 2
            computedY += annotation.height / 2
        }
        if (eighth === 6) {
            computedX -= annotation.width / 2
        }
        if (eighth === 7) {
            computedX -= annotation.width / 2
            computedY -= annotation.height / 2
        }
    }

    let textX = computedNoteX
    const textY = computedNoteY - noteTextOffset

    let noteLineX = computedNoteX
    const noteLineY = computedNoteY

    if ((angle + 90) % 360 > 180) {
        textX -= noteWidth
        noteLineX -= noteWidth
    } else {
        noteLineX += noteWidth
    }

    return {
        points: [
            [computedX, computedY],
            [computedNoteX, computedNoteY],
            [noteLineX, noteLineY],
        ] as [number, number][],
        text: [textX, textY],
        angle: angle + 90,
    }
}
