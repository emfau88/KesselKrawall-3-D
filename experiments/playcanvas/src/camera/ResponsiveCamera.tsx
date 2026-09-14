import { Entity } from '@playcanvas/react';
import { Camera } from '@playcanvas/react/components';
import { useAppEvent } from '@playcanvas/react/hooks';
import { Vec3 } from 'playcanvas';
import type { Entity as PcEntity } from 'playcanvas';
import { useLayoutEffect, useRef } from 'react';

import type { ResolvedCameraProfile } from './cameraProfiles';

export function ResponsiveCamera({ profile }: { profile: ResolvedCameraProfile }) {
    const entity = useRef<PcEntity>(null);
    const goal = useRef(profile);
    const currentTarget = useRef(new Vec3(...profile.target));
    const targetPosition = useRef(new Vec3(...profile.position));
    const targetLookAt = useRef(new Vec3(...profile.target));
    const nextPosition = useRef(new Vec3(...profile.position));
    const initialized = useRef(false);

    useLayoutEffect(() => {
        goal.current = profile;
        if (!entity.current || initialized.current) return;
        entity.current.setPosition(...profile.position);
        entity.current.lookAt(...profile.target);
        initialized.current = true;
    }, [profile]);

    useAppEvent('update', (dt: number) => {
        if (!entity.current || !initialized.current) return;
        const blend = 1 - Math.exp(-7.5 * Math.min(dt, 0.1));
        targetPosition.current.set(...goal.current.position);
        targetLookAt.current.set(...goal.current.target);
        nextPosition.current.lerp(entity.current.getPosition(), targetPosition.current, blend);
        entity.current.setPosition(nextPosition.current);
        currentTarget.current.lerp(currentTarget.current, targetLookAt.current, blend);
        entity.current.lookAt(currentTarget.current);
    });

    return (
        <Entity ref={entity} name={`camera-${profile.id}`}>
            <Camera clearColor="#120b14" fov={profile.fov} nearClip={profile.nearClip} farClip={profile.farClip} />
        </Entity>
    );
}
