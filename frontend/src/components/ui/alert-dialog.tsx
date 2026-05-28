'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface AlertDialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: React.ReactNode
}

const AlertDialog = ({ open, onOpenChange, children }: AlertDialogProps) => {
    if (!open) return null
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            aria-modal="true"
            role="alertdialog"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={() => onOpenChange?.(false)}
            />
            {children}
        </div>
    )
}

const AlertDialogContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'relative z-50 w-full max-w-md rounded-lg bg-background p-6 shadow-lg',
            className
        )}
        {...props}
    >
        {children}
    </div>
))
AlertDialogContent.displayName = 'AlertDialogContent'

const AlertDialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('flex flex-col space-y-2 mb-4', className)} {...props} />
)
AlertDialogHeader.displayName = 'AlertDialogHeader'

const AlertDialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6', className)}
        {...props}
    />
)
AlertDialogFooter.displayName = 'AlertDialogFooter'

const AlertDialogTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h2
        ref={ref}
        className={cn('text-lg font-semibold', className)}
        {...props}
    />
))
AlertDialogTitle.displayName = 'AlertDialogTitle'

const AlertDialogDescription = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ className, asChild, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<{ className?: string }>
        return React.cloneElement(child, {
            className: cn('text-sm text-muted-foreground', child.props?.className),
            ...props,
        })
    }
    return (
        <div
            ref={ref}
            className={cn('text-sm text-muted-foreground', className)}
            {...props}
        >
            {children}
        </div>
    )
})
AlertDialogDescription.displayName = 'AlertDialogDescription'

const AlertDialogAction = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
    <button
        ref={ref}
        className={cn(
            'inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors',
            className
        )}
        {...props}
    />
))
AlertDialogAction.displayName = 'AlertDialogAction'

const AlertDialogCancel = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
    <button
        ref={ref}
        className={cn(
            'inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors mt-2 sm:mt-0',
            className
        )}
        {...props}
    />
))
AlertDialogCancel.displayName = 'AlertDialogCancel'

// Trigger — no se usa en este proyecto (el modal se controla con open/onOpenChange)
const AlertDialogTrigger = ({ children }: { children?: React.ReactNode }) => <>{children}</>

export {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
}
