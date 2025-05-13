import ComponentsDatatablesTemplate from '@/components/datatables/components-datatables-template';
import IconBell from '@/components/icon/icon-bell';
import { Metadata } from 'next';
import React from 'react';
import DefaultLayout from '../layout';
export const metadata: Metadata = {
   
};

const Export = () => {
    return (
       
        <DefaultLayout>
            <ComponentsDatatablesTemplate />
        </DefaultLayout>
     
    );
};

export default Export;